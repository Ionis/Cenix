const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {

    // Получаем аргументы командной строки
    const [url, region] = process.argv.slice(2);

    if (!url || !region) {
        console.error('Usage: node index.js <url> "<region>"');
        process.exit(1);
    }

    // Запускаем браузер и открываем новую вкладку
    const browser = await puppeteer.launch({headless: false});
    const page = await browser.newPage();

    // Устанавливаем собственный размер области просмотра
    await page.setViewport({ width: 1200, height: 800 });

    // Отключаем автоматическую навигацию и перезагрузку страницы
    await page.setRequestInterception(true);
    page.on('request', (request) => {
        if (request.isNavigationRequest() && request.redirectChain().length) {
            request.abort();
        } else {
            request.continue();
        }
    });

    // Переход на страницу товара
    await page.goto(url, { waitUntil: 'networkidle2' });

    // Выбираем регион
    try {
        // Закрываем модальное окно
        await page.locator('button[class^=Tooltip_closeIcon__]').click();
        await delay(2000);  // Дополнительное ожидание

        // Открываем окно выбора региона
        await page.locator('div[class^=Region_region__]').click();

        // Выбираем регион
        await delay(2000);  // Дополнительное ожидание
        await page.locator('div ::-p-text(Санкт-Петербург и область)').click(); // Кликаем по требуемому региону
        await page.waitForSelector('div[class^=UiHeaderHorizontalBase_region__] ::-p-text(Санкт-Петербург и область)'); // Ждем пока страница перезагрузится
    } catch (error) {
        console.error('Ошибка при выборе региона:', error);
        await browser.close();
        process.exit(1);
    }

    // Делаем полноразмерный скриншот
    const viewport = await page.viewport();
    if (viewport.width > 0 && viewport.height > 0) {
        await page.screenshot({ path: 'screenshot.jpg', fullPage: true });
    } else {
        console.error('Ошибка: Размеры окна просмотра равны нулю. Скриншот не сделан.');
    }

    // Извлекаем данные о товаре
    const price = await getElementText(page, 'div[class^=PriceInfo_root__] > span[class^=Price_price__]');
    const oldPrice = await getElementText(page, 'div[class^=PriceInfo_oldPrice__]');
    const rating = await getElementText(page, 'a[class^=ActionsRow_stars__]');
    const reviews = await getElementText(page, 'a[class^=ActionsRow_reviews__]');

    // Сохраняем данные о товаре в файл
    const productData = `
URL: ${url}
Регион: ${region}
Цена: ${price}
Старая цена: ${oldPrice || 'Нет'}
Рейтинг: ${rating || 'Нет'}
Количество отзывов: ${reviews || 'Нет'}
    `;
    fs.writeFileSync('product.txt', productData.trim());

    // Закрываем браузер
    await browser.close();

})();

// Функция для ожидания
const delay = (time) => new Promise(resolve => setTimeout(resolve, time));

// Функция для извлечения текста элемента, если он существует
const getElementText = async (page, selector) => {
    const element = await page.$(selector);
    return element ? page.evaluate(el => el.textContent.trim(), element) : null;
};