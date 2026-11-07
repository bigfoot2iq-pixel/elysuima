export type MintEligibilityTier = "gtd" | "fcfs" | "both" | "none";

export type MintEligibilityResponse = {
  address: string;
  gtd: boolean;
  fcfs: boolean;
  tier: MintEligibilityTier;
  checkedAt: number;
};

export type MintEligibilityErrorCode =
  | "INVALID_BODY"
  | "INVALID_ADDRESS"
  | "NOT_AUTHORIZED"
  | "RATE_LIMITED"
  | "CHECK_UNAVAILABLE"
  | "CHECK_FAILED";

export type MintEligibilityError = {
  error: MintEligibilityErrorCode;
  message: string;
};
