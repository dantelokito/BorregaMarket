export function isDemoSeedAllowed(
  nodeEnv = process.env.NODE_ENV,
  allowDemoSeed = process.env.ALLOW_DEMO_SEED
): boolean {
  if (nodeEnv !== "production") return true;
  return allowDemoSeed === "true";
}
