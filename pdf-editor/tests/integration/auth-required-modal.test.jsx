import React, { act } from "react";
import TestRenderer from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import { AuthRequiredModal } from "../../src/components/editor/AuthRequiredModal.jsx";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function renderedText(renderer) {
  return JSON.stringify(renderer.toJSON());
}

describe("cloud action authentication prompt", () => {
  it("explains account saving and lets the guest continue editing", async () => {
    const onClose = vi.fn();
    const onSignIn = vi.fn();
    let renderer;
    await act(async () => {
      renderer = TestRenderer.create(<AuthRequiredModal action="save" onClose={onClose} onSignIn={onSignIn} />);
    });

    expect(renderedText(renderer)).toContain("Sign in to save this document to your account and access it later.");
    const buttons = renderer.root.findAllByType("button");
    const continueButton = buttons.find((button) => button.children.join("") === "Continue without saving");
    const signInButton = buttons.find((button) => button.children.join("") === "Sign in to save");

    await act(async () => continueButton.props.onClick());
    expect(onClose).toHaveBeenCalledOnce();
    await act(async () => signInButton.props.onClick());
    expect(onSignIn).toHaveBeenCalledOnce();
  });
});
