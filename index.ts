import fs from "fs";
import type { Page } from "puppeteer";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

// Add stealth plugin to puppeteer
puppeteer.use(StealthPlugin());

interface Product {
	// title: string;
	// price: string;
	// originalPrice: string;
	// discountPercentage: string;
	// imageUrl: string;
	productUrl: string;
}

async function main() {
	console.log("Starting Amazon coupon scraper...");

	const browser = await puppeteer.launch({
		headless: false,
		executablePath:
			process.env.CHROME_PATH ||
			"C:/Program Files/Google/Chrome/Application/chrome.exe",
		userDataDir:
			process.env.CHROME_USER_DATA_DIR ||
			"C:\\Users\\dashi\\AppData\\Local\\Google\\Chrome\\User Data",
		args: [
			"--no-sandbox",
			"--disable-setuid-sandbox",
			"--disable-dev-shm-usage",
			"--disable-accelerated-2d-canvas",
			"--disable-gpu",
			"--window-size=1920,1080",
			"--font-render-hinting=none",
			"--lang=ja-JP,ja",
			"--profile-directory=Default",
		],
		defaultViewport: null,
		ignoreDefaultArgs: ["--enable-automation"],
	});

	try {
		const page = await browser.newPage();

		// Randomize user agent (optional additional stealth measure)
		await page.setUserAgent(
			"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
		);

		// Set extra HTTP headers to appear more human-like
		await page.setExtraHTTPHeaders({
			"Accept-Language": "ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7",
			Accept:
				"text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
			"Accept-Encoding": "gzip, deflate, br",
			Connection: "keep-alive",
			"Upgrade-Insecure-Requests": "1",
		});

		await page.evaluateOnNewDocument(() => {
			const style = document.createElement("style");
			style.textContent = `
        * {
          font-family: "Noto Sans CJK JP", "Noto Sans JP", "Meiryo", "MS PGothic", sans-serif !important;
        }
      `;
			document.head.appendChild(style);
		});

		// The simplified URL with coupon and 50%+ discount filters
		const url =
			"https://www.amazon.co.jp/deals?bubble-id=deals-collection-coupons&discounts-widget=%7B%22state%22%3A%7B%22refinementFilters%22%3A%7B%22percentOff%22%3A%5B%223%22%5D%7D%7D%2C%22version%22%3A1%7D";

		console.log(`Navigating to ${url}`);
		await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });

		// Wait for the products to load
		await page.waitForSelector(
			".GridItem-module__container_PW2gdkwTj1GQzdwJjejN",
			{ timeout: 10000 },
		);

		// Add random delay to mimic human behavior
		await randomDelay(2000, 5000);

		// Extract product information
		const products = await extractProducts(page);

		console.log(
			`Found ${products.length} products with coupons and 50%+ discount`,
		);

		// Save results to JSON file
		fs.writeFileSync(
			"amazon_coupon_products.json",
			JSON.stringify(products, null, 2),
		);
		console.log("Results saved to amazon_coupon_products.json");
	} catch (error) {
		console.error("An error occurred:", error);
	} finally {
		await browser.close();
		console.log("Browser closed");
	}
}

async function extractProducts(page: Page): Promise<Product[]> {
	return page.evaluate(() => {
		const productItems = document.querySelectorAll(
			".GridItem-module__container_PW2gdkwTj1GQzdwJjejN",
		);
		const products: Product[] = [];

		for (const item of Array.from(productItems)) {
			try {
				const productUrl = item.querySelector("a")?.getAttribute("href") || "";
				products.push({ productUrl });
			} catch (error) {
				console.error("Error extracting product data:", error);
			}
		}

		return products;
	});
}

async function autoScroll(page: Page): Promise<void> {
	await page.evaluate(async () => {
		await new Promise<void>((resolve) => {
			let totalHeight = 0;
			const distance = 100;
			const timer = setInterval(() => {
				const scrollHeight = document.body.scrollHeight;
				window.scrollBy(0, distance);
				totalHeight += distance;

				// Add random delay to scrolling
				const randomDelay = Math.floor(Math.random() * 300) + 200;
				setTimeout(() => {}, randomDelay);

				if (totalHeight >= scrollHeight) {
					clearInterval(timer);
					resolve();
				}
			}, 500);
		});
	});
}

async function randomDelay(min: number, max: number): Promise<void> {
	const delay = Math.floor(Math.random() * (max - min + 1)) + min;
	return new Promise((resolve) => setTimeout(resolve, delay));
}

// Add cookie consent handler (Amazon often shows cookie consent popup)
// async function handleCookieConsent(page: Page): Promise<void> {
// 	try {
// 		// Check if cookie consent popup exists
// 		const cookieConsentExists = await page.evaluate(() => {
// 			return !!document.querySelector(
// 				'#sp-cc-accept, .a-button-input[name="accept"]',
// 			);
// 		});
//
// 		if (cookieConsentExists) {
// 			await page.click('#sp-cc-accept, .a-button-input[name="accept"]');
// 			console.log("Cookie consent accepted");
// 			await randomDelay(1000, 2000);
// 		}
// 	} catch (error) {
// 		console.log("No cookie consent popup found or error handling it:", error);
// 	}
// }

main().catch(console.error);
