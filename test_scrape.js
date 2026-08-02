import axios from 'axios';
import * as cheerio from 'cheerio';
import dotenv from 'dotenv';
dotenv.config();

const scrapeArticleFullText = async (url) => {
  console.log(`Attempting to scrape: ${url}`);
  try {
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
      timeout: 10000 // Increased timeout
    });
    
    console.log(`Successfully fetched HTML. Length: ${data.length}`);
    const $ = cheerio.load(data);
    
    // Attempt to extract text from common article containers
    let content = '';
    const articleSelectors = [
      'article',
      '.article-content',
      '.story-body',
      '.entry-content',
      'main',
      '.post-content',
      '#main-content'
    ];

    for (const selector of articleSelectors) {
      if ($(selector).length > 0) {
        $(selector).find('p').each((i, el) => {
          content += $(el).text().trim() + '\n\n';
        });
        if (content.trim().length > 0) {
           console.log(`Found content using selector: ${selector}`);
           break;
        }
      }
    }

    if (content.trim().length === 0) {
      console.log('No specific container found, grabbing all <p> tags...');
      $('p').each((i, el) => {
        const text = $(el).text().trim();
        if (text.length > 50) {
          content += text + '\n\n';
        }
      });
    }

    return content.trim();
  } catch (error) {
    console.error(`Failed to scrape article text from ${url}:`, error.message);
    if (error.response) {
      console.error(`Status code: ${error.response.status}`);
    }
    return null;
  }
};

const run = async () => {
    try {
        let apiKey = process.env.CURRENTS_API_KEY;
        if (!apiKey) {
            console.log("No API key found in .env");
            return;
        }
        console.log("Fetching a sample article from Currents API...");
        const res = await axios.get(`https://api.currentsapi.services/v1/latest-news?language=en&category=lifestyle&apiKey=${apiKey.trim()}`);
        if (res.data && res.data.news && res.data.news.length > 0) {
            const article = res.data.news[0];
            console.log("Article Object keys:", Object.keys(article));
            
            // Check if the URL property is 'url' or 'url'
            const sampleUrl = article.url || article.link; 
            console.log(`Sample URL from API: ${sampleUrl}`);
            
            if (sampleUrl) {
                const text = await scrapeArticleFullText(sampleUrl);
                console.log("--- SCRAPED TEXT PREVIEW ---");
                console.log(text ? text.substring(0, 500) + '...' : "NO TEXT SCRAPED");
                console.log("----------------------------");
            } else {
                console.log("No URL found in article object.");
            }
        } else {
            console.log("No articles returned from API.");
        }
    } catch(e) {
        console.error("Error calling API:", e.message);
    }
}

run();
