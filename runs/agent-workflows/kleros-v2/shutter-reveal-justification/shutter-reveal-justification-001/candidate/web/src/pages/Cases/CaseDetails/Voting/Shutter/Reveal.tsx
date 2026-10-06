import React, { useCallback, useMemo } from "react";
import styled from "styled-components";

import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import type { Address } from "viem";

import { Button } from "@kleros/ui-components-library";

import { useRevealVote } from "hooks/useRevealVote";
import type { Bytes32Hash } from "utils/crypto/hashVote";

import { useDisputeDetailsQuery } from "queries/useDisputeDetailsQuery";
import { usePopulatedDisputeData } from "queries/usePopulatedDisputeData";

import { DisputeKits } from "src/dispute-kits";

const Container = styled.div`
  width: 100%;
  height: auto;
  display: flex;
  justify-content: center;
  margin-top: 16px;
`;

interface IReveal {
  arbitrable?: Address;
  commit?: Bytes32Hash;
  voteIDs: string[];
  setIsOpen: (val: boolean) => void;
  disputeKitId: DisputeKits;
}

const Reveal: React.FC<IReveal> = ({ voteIDs, setIsOpen, disputeKitId, commit, arbitrable }) => {
  const { t } = useTranslation();
  const { id } = useParams();
  const { data: disputeData } = useDisputeDetailsQuery(id);
  const { data: disputeDetails } = usePopulatedDisputeData(id, arbitrable);
  const currentRoundIndex = disputeData?.dispute?.currentRoundIndex;

  const parsedDisputeID = useMemo(() => BigInt(id ?? 0), [id]);
  const parsedVoteIDs = useMemo(() => voteIDs.map((voteID) => BigInt(voteID)), [voteIDs]);

  const { mutateAsync: revealVote, isPending } = useRevealVote(() => {
    setIsOpen(true);
  });
  const handleReveal = useCallback(async () => {
    // inline check: src/utils cannot be loaded by vitest (@kleros/kleros-app has no main entry)
    if (currentRoundIndex === undefined || currentRoundIndex === null) {
      return;
    }

    await revealVote({
      params: {
        disputeId: parsedDisputeID,
        voteIds: parsedVoteIDs,
        roundIndex: Number(currentRoundIndex),
        disputeKitId,
      },
      context: {
        commit,
        answers: disputeDetails?.answers,
      },
    });
  }, [parsedVoteIDs, currentRoundIndex, revealVote, disputeDetails, commit, disputeKitId, parsedDisputeID]);

  return (
    <Container>
      <Button text={t("buttons.reveal_your_vote")} onClick={handleReveal} disabled={isPending} isLoading={isPending} />
    </Container>
  );
};

export default Reveal;
