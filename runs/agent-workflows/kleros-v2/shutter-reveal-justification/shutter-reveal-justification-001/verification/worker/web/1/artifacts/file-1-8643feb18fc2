import React from "react";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { storeCommitData } from "actions/helpers/storage";
import { getVoteKey } from "actions/helpers/storage/getVoteKey";
import type { ResolveRevealParams } from "actions/reveal/params";
import { resolveRevealInputs } from "actions/reveal/resolveRevealInputs";

import { DisputeKits } from "src/dispute-kits/disputeKits";

import Reveal from "./Reveal";

const { mockRevealVote } = vi.hoisted(() => ({ mockRevealVote: vi.fn() }));

vi.mock("hooks/useRevealVote", () => ({
  useRevealVote: () => ({ mutateAsync: mockRevealVote, isPending: false }),
}));

vi.mock("queries/useDisputeDetailsQuery", () => ({
  useDisputeDetailsQuery: () => ({ data: { dispute: { currentRoundIndex: "2" } } }),
}));

vi.mock("queries/usePopulatedDisputeData", () => ({
  usePopulatedDisputeData: () => ({ data: { answers: [] } }),
}));

vi.mock("react-router-dom", () => ({
  useParams: () => ({ id: "42" }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@kleros/ui-components-library", () => ({
  Button: ({ text, onClick, disabled }: { text: string; onClick: () => void; disabled?: boolean }) => (
    <button {...{ onClick, disabled }}>{text}</button>
  ),
}));

// avoid loading the dispute-kit registry, only the enum is needed
vi.mock("src/dispute-kits", async () => import("src/dispute-kits/disputeKits"));

describe("Shutter Reveal", () => {
  beforeEach(() => {
    mockRevealVote.mockResolvedValue(undefined);
  });

  const clickReveal = async (disputeKitId: DisputeKits) => {
    render(<Reveal voteIDs={["3", "4"]} setIsOpen={vi.fn()} disputeKitId={disputeKitId} commit="0x1234" />);
    fireEvent.click(screen.getByText("buttons.reveal_your_vote"));
    await waitFor(() => expect(mockRevealVote).toHaveBeenCalledTimes(1));
    return mockRevealVote.mock.calls[0][0] as { params: ResolveRevealParams };
  };

  it.each([DisputeKits.Shutter, DisputeKits.GatedShutter])(
    "should not send a justification in the reveal params (kit %s)",
    async (disputeKitId) => {
      const { params } = await clickReveal(disputeKitId);

      expect(params).toEqual({ disputeId: 42n, voteIds: [3n, 4n], roundIndex: 2, disputeKitId });
      expect(params).not.toHaveProperty("justification");
    }
  );

  it("should resolve the stored commit-time justification from the sent params", async () => {
    const { params } = await clickReveal(DisputeKits.Shutter);
    storeCommitData(getVoteKey(params.disputeId, params.roundIndex, params.voteIds), {
      salt: 123n,
      choice: 1n,
      justification: "stored text",
    });

    const result = await resolveRevealInputs(params, {});

    expect(result).toMatchObject({ salt: 123n, choice: 1n, justification: "stored text" });
  });
});
