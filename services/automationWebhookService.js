import axios from 'axios';

const WEBHOOK_TIMEOUT_MS = 5000;

export const notifyArticleApproved = async (article) => {
  const webhookUrl = String(process.env.N8N_ARTICLE_WEBHOOK_URL || '').trim();
  const automationKey = String(process.env.N8N_AUTOMATION_KEY || '').trim();

  if (!webhookUrl || !article?._id) {
    return { delivered: false, reason: 'not-configured' };
  }

  const response = await axios.post(webhookUrl, {
    articleId: article._id.toString(),
    title: article.title,
    subtitle: article.subtitle || '',
    content: article.content || '',
    category: article.category || '',
    tags: article.tags || [],
    slug: article.slug || '',
    aiSummary: article.aiSummary || '',
    publishedAt: article.publishedAt || article.createdAt || null
  }, {
    timeout: WEBHOOK_TIMEOUT_MS,
    headers: {
      'content-type': 'application/json',
      ...(automationKey ? { 'x-automation-key': automationKey } : {})
    }
  });

  return { delivered: response.status >= 200 && response.status < 300 };
};

export const notifyArticleApprovedInBackground = (article) => {
  void notifyArticleApproved(article).catch((error) => {
    console.error('n8n article-approved webhook failed:', error.message);
  });
};

