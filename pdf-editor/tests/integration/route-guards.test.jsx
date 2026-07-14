import React, { act, useContext, useMemo, useState } from "react";
import TestRenderer from "react-test-renderer";
import { createMemoryRouter, Outlet, RouterProvider, useLocation, useNavigate, useParams } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { AuthContext } from "../../src/auth/AuthContext.jsx";
import { AppLayout } from "../../src/layouts/AppLayout.jsx";
import { EditorRouteStatePage } from "../../src/pages/app/EditorRouteStatePage.jsx";
import { NotFoundPage } from "../../src/pages/errors/NotFoundPage.jsx";
import { PublicPlaceholderPage } from "../../src/pages/public/PublicPlaceholderPage.jsx";
import { WorkflowUnavailablePage } from "../../src/pages/public/WorkflowUnavailablePage.jsx";
import { ProtectedRoute } from "../../src/router/ProtectedRoute.jsx";
import { PublicOnlyRoute } from "../../src/router/PublicOnlyRoute.jsx";
import { editorPath } from "../../src/router/routePaths.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function authValue(overrides = {}) {
  return {
    authReady: true,
    currentUser: null,
    isFirebaseConfigured: true,
    authenticate: async () => ({ ok: true }),
    resetPassword: async () => ({ ok: true }),
    logout: async () => {},
    ...overrides,
  };
}

async function renderRoutes(routes, initialEntries, value) {
  const router = createMemoryRouter(routes, { initialEntries });
  let renderer;
  await act(async () => {
    renderer = TestRenderer.create(
      <AuthContext.Provider value={value}><RouterProvider router={router} /></AuthContext.Provider>,
    );
  });
  return { router, renderer };
}

function renderedText(renderer) {
  return JSON.stringify(renderer.toJSON());
}

describe("route guards", () => {
  const protectedRoutes = [
    { element: <ProtectedRoute />, children: [{ element: <AppLayout />, children: [{ path: "/app/dashboard", element: <div>Private dashboard</div> }] }] },
    { path: "/login", element: <div>Login page</div> },
  ];

  it("shows auth loading without redirecting early", async () => {
    const { router, renderer } = await renderRoutes(protectedRoutes, ["/app/dashboard"], authValue({ authReady: false }));
    expect(renderedText(renderer)).toContain("Opening workspace");
    expect(router.state.location.pathname).toBe("/app/dashboard");
  });

  it("redirects unauthenticated app visits and preserves the requested route", async () => {
    const { router, renderer } = await renderRoutes(protectedRoutes, ["/app/dashboard"], authValue());
    expect(router.state.location.pathname).toBe("/login");
    expect(router.state.location.state.from.pathname).toBe("/app/dashboard");
    expect(renderedText(renderer)).toContain("Login page");
  });

  it("renders protected content for an authenticated user", async () => {
    const { renderer } = await renderRoutes(protectedRoutes, ["/app/dashboard"], authValue({ currentUser: { uid: "user-1" } }));
    expect(renderedText(renderer)).toContain("Private dashboard");
    expect(renderer.root.findByProps({ className: "app-route-layout" })).toBeTruthy();
  });

  it("returns authenticated users from public-only auth routes to the requested app route", async () => {
    const routes = [
      { element: <PublicOnlyRoute />, children: [{ path: "/login", element: <div>Login page</div> }] },
      { path: "/app/documents", element: <div>Documents</div> },
    ];
    const { router, renderer } = await renderRoutes(routes, [{ pathname: "/login", state: { from: { pathname: "/app/documents" } } }], authValue({ currentUser: { uid: "user-1" } }));
    expect(router.state.location.pathname).toBe("/app/documents");
    expect(renderedText(renderer)).toContain("Documents");
  });
});

function TestAuthHarness({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const value = useMemo(() => authValue({
    currentUser,
    authenticate: async () => {
      const user = { uid: "test-user" };
      setCurrentUser(user);
      return { ok: true, user };
    },
  }), [currentUser]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function StatefulLoginButton() {
  const auth = useContext(AuthContext);
  return <button type="button" onClick={() => auth.authenticate({ mode: "login" })}>Complete login</button>;
}

describe("post-login return", () => {
  it("returns to the originally requested protected route after deterministic test authentication", async () => {
    const routes = [
      { element: <ProtectedRoute />, children: [{ path: "/app/dashboard", element: <div>Private dashboard</div> }] },
      { element: <PublicOnlyRoute />, children: [{ path: "/login", element: <StatefulLoginButton /> }] },
    ];
    const router = createMemoryRouter(routes, { initialEntries: ["/app/dashboard"] });
    let renderer;
    await act(async () => {
      renderer = TestRenderer.create(<TestAuthHarness><RouterProvider router={router} /></TestAuthHarness>);
    });
    expect(router.state.location.pathname).toBe("/login");
    const loginButton = renderer.root.findByType("button");
    await act(async () => loginButton.props.onClick());
    expect(router.state.location.pathname).toBe("/app/dashboard");
    expect(renderedText(renderer)).toContain("Private dashboard");
  });
});

function DocumentRowHarness() {
  const navigate = useNavigate();
  return <button type="button" onClick={() => navigate(editorPath("doc-routing-1"))}>Open routing document</button>;
}

function EditorParamProbe() {
  const { documentId } = useParams();
  const location = useLocation();
  return <div>{location.pathname}|{documentId}</div>;
}

describe("document navigation contract", () => {
  const routes = [{ element: <Outlet />, children: [
    { path: "/app/documents", element: <DocumentRowHarness /> },
    { path: "/app/editor/:documentId", element: <EditorParamProbe /> },
  ] }];

  it("opens the correct editor URL, restores its parameter, and supports back/forward", async () => {
    const { router, renderer } = await renderRoutes(routes, ["/app/documents"], authValue({ currentUser: { uid: "user-1" } }));
    await act(async () => renderer.root.findByType("button").props.onClick());
    expect(router.state.location.pathname).toBe("/app/editor/doc-routing-1");
    expect(renderedText(renderer)).toContain("doc-routing-1");
    await act(async () => router.navigate(-1));
    expect(router.state.location.pathname).toBe("/app/documents");
    await act(async () => router.navigate(1));
    expect(router.state.location.pathname).toBe("/app/editor/doc-routing-1");

    const refreshed = await renderRoutes(routes, [router.state.location.pathname], authValue({ currentUser: { uid: "user-1" } }));
    expect(refreshed.router.state.location.pathname).toBe("/app/editor/doc-routing-1");
    expect(renderedText(refreshed.renderer)).toContain("doc-routing-1");
  });
});

describe("safe error routes", () => {
  it("renders a public route page", async () => {
    const { renderer } = await renderRoutes([{
      path: "/features",
      element: <PublicPlaceholderPage title="Features" description="RealPDF features" status="Available" />,
    }], ["/features"], authValue());
    expect(renderer.root.findByType("h1").children.join("")).toBe("Features");
  });

  it("renders a helpful invalid-document state", async () => {
    const { renderer } = await renderRoutes([{
      path: "/app/editor/:documentId",
      element: <EditorRouteStatePage state="not-found" onBack={() => {}} />,
    }], ["/app/editor/missing-document"], authValue({ currentUser: { uid: "user-1" } }));
    expect(renderer.root.findByType("h1").children.join("")).toBe("Document not found");
  });

  it("renders a helpful 404 with authenticated dashboard navigation", async () => {
    const { renderer } = await renderRoutes([{ path: "*", element: <NotFoundPage /> }], ["/missing"], authValue({ currentUser: { uid: "user-1" } }));
    expect(renderedText(renderer)).toContain("Page not found");
    expect(renderer.root.findAllByType("a").some((link) => link.props.href === "/app/dashboard")).toBe(true);
  });

  it("never exposes a document for invalid share or sign tokens", async () => {
    const routes = [
      { path: "/share/:token", element: <WorkflowUnavailablePage kind="share" /> },
      { path: "/sign/:token", element: <WorkflowUnavailablePage kind="signing" /> },
    ];
    const share = await renderRoutes(routes, ["/share/invalid-token"], authValue());
    expect(share.renderer.root.findByType("h1").children.join("")).toBe("This share link cannot be opened");
    expect(renderedText(share.renderer)).toContain("invalid-token");
    const signing = await renderRoutes(routes, ["/sign/invalid-token"], authValue());
    expect(signing.renderer.root.findByType("h1").children.join("")).toBe("This signing link cannot be opened");
  });
});
