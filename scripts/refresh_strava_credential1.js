const { chromium } = require("playwright"); // Import de Playwright

const STRAVA_EMAIL = process.env.STRAVA_EMAIL;
const STRAVA_PASSWORD = process.env.STRAVA_PASSWORD;

(async () => {
  const requiredCookieNames = new Set([
    "CloudFront-Policy",
    "CloudFront-Key-Pair-Id",
    "CloudFront-Signature",
    "_strava4_session",
  ]);

  // Fonction pour formater les cookies
  const getCookieString = (cookies) =>
    cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");

  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Étape 1 : Ouvrir la page de login
    await page.goto("https://www.strava.com/login", { waitUntil: "networkidle" })

    // Étape 2 : Remplir et soumettre le formulaire
    await page.waitForSelector('input[name="email"]', { timeout: 60000 });
    await page.click('button[data-cy="accept-cookies"]');    
    await page.fill('input[name="email"]', STRAVA_EMAIL);
    await page.fill('input[name="password"]', STRAVA_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: "networkidle", timeout: 60000 });

    // Étape 3 : Extraire les cookies de la session
    const sessionCookies = await page.context().cookies();
    const sessionCookieString = getCookieString(sessionCookies);

    // Étape 4 : Accéder à l'authentification des heatmaps
    const authResp = await page.goto("https://heatmap-external-a.strava.com/auth");
    if (authResp.status() !== 200) {
      throw new Error("Échec de l'authentification des heatmaps.");
    }

    // Étape 5 : Extraire les cookies après l'authentification
    const authCookies = await page.context().cookies();

    // Fusionner les cookies de session et d'authentification
    const allCookies = [...sessionCookies, ...authCookies];

    // Filtrer les cookies requis
    const requiredCookies = allCookies.filter((cookie) =>
      requiredCookieNames.has(cookie.name)
    );
    const stravaCookies = getCookieString(requiredCookies);

    // Trouver l'ID utilisateur Strava
    const stravaRememberId = sessionCookies.find((cookie) =>
      cookie.name === "strava_remember_id"
    )?.value;

    if (!stravaRememberId) {
      throw new Error("Impossible de trouver l'ID utilisateur Strava.");
    }

    // Étape 6 : Afficher les résultats
    console.log(`STRAVA_ID='${stravaRememberId}'`);
    console.log(`STRAVA_COOKIES='${stravaCookies}'`);
  } catch (error) {
    console.error("Erreur :", error.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
