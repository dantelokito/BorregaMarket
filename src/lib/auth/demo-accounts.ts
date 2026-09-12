export function shouldShowDemoAccounts(nodeEnv: string = process.env.NODE_ENV): boolean {
  return nodeEnv !== "production";
}
