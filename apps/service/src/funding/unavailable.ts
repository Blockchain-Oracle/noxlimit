import type {
  FundingChallengeRequest,
  FundingChallengeResponse,
  FundingClaimRequest,
  FundingClaimResponse,
} from "@noxlimit/protocol";

import type { FundingCoordinator } from "../api/ports.js";

export class FundingUnavailable implements FundingCoordinator {
  constructor(readonly reason = "Testnet funding is not configured.") {}

  challenge(_input: FundingChallengeRequest): Promise<FundingChallengeResponse> {
    return Promise.reject(new ServiceUnavailableError(this.reason));
  }

  claim(_input: FundingClaimRequest): Promise<FundingClaimResponse> {
    return Promise.reject(new ServiceUnavailableError(this.reason));
  }
}

class ServiceUnavailableError extends Error {
  readonly statusCode = 503;
}
