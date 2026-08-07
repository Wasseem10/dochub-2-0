import React, { act } from "react";
import TestRenderer from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import { AuthRequiredModal } from "../../src/components/editor/AuthRequiredModal.jsx";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function renderedText(renderer) {
  return JSON.stringify(renderer.toJSON());
}

describe("cloud action authentication prompt", () => {
  it("explains automatic account sync and lets the guest keep working locally", async () => {
    const onClose = vi.fn();
    const onSignIn = vi.fn();
    let renderer;
    await act(async () => {
      renderer = TestRenderer.create(<AuthRequiredModal action="save" onClose={onClose} onSignIn={onSignIn} />);
    });

    expect(renderedText(renderer)).toContain("Sign in and this PDF will sync automatically to your private account.");
    const buttons = renderer.root.findAllByType("button");
    const continueButton = buttons.find((button) => button.children.join("") === "Keep on this device");
    const signInButton = buttons.find((button) => button.children.join("") === "Sign in to sync");

    await act(async () => continueButton.props.onClick());
    expect(onClose).toHaveBeenCalledOnce();
    await act(async () => signInButton.props.onClick());
    expect(onSignIn).toHaveBeenCalledOnce();
  });
});
