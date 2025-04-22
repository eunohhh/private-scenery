export const PUBLIC_URL = process.env.NEXT_PUBLIC_BASE_URL;
export const isProductionEnvironment = process.env.NODE_ENV === "production";

export const isTestEnvironment = Boolean(
	process.env.PLAYWRIGHT_TEST_BASE_URL ||
		process.env.PLAYWRIGHT ||
		process.env.CI_PLAYWRIGHT,
);
