const STOP_WORDS = new Set([
  'about', 'above', 'across', 'after', 'again', 'against', 'all', 'almost', 'alone', 'along', 'already', 'also', 'although', 'always', 'among', 'and', 'another', 'any', 'anyone', 'anything', 'anywhere', 'are', 'area', 'areas', 'around', 'back', 'backed', 'backing', 'backs', 'be', 'became', 'because', 'become', 'becomes', 'been', 'before', 'began', 'behind', 'being', 'beings', 'best', 'better', 'between', 'big', 'both', 'but', 'by', 'came', 'can', 'cannot', 'case', 'cases', 'certain', 'certainly', 'clear', 'clearly', 'come', 'could', 'did', 'differ', 'different', 'differently', 'do', 'does', 'done', 'down', 'downed', 'downing', 'downs', 'during', 'each', 'early', 'either', 'end', 'ended', 'ending', 'ends', 'enough', 'even', 'evenly', 'ever', 'every', 'everybody', 'everyone', 'everything', 'everywhere', 'face', 'faces', 'fact', 'facts', 'far', 'felt', 'few', 'find', 'finds', 'first', 'for', 'four', 'from', 'full', 'fully', 'further', 'furthered', 'furthering', 'furthers', 'gave', 'general', 'generally', 'get', 'gets', 'give', 'given', 'gives', 'go', 'going', 'good', 'goods', 'got', 'great', 'greater', 'greatest', 'group', 'grouped', 'grouping', 'groups', 'had', 'has', 'have', 'having', 'he', 'her', 'here', 'herself', 'high', 'highs', 'high', 'him', 'himself', 'his', 'how', 'however', 'i', 'if', 'important', 'in', 'interest', 'interested', 'interesting', 'interests', 'into', 'is', 'it', 'its', 'itself', 'just', 'keep', 'keeps', 'kind', 'knew', 'know', 'known', 'knows', 'large', 'largely', 'last', 'later', 'latest', 'least', 'less', 'let', 'lets', 'like', 'likely', 'long', 'longer', 'longest', 'made', 'make', 'making', 'man', 'many', 'may', 'me', 'member', 'members', 'men', 'might', 'more', 'most', 'mostly', 'mr', 'mrs', 'much', 'must', 'my', 'myself', 'necessary', 'need', 'needed', 'needing', 'needs', 'never', 'new', 'newer', 'newest', 'next', 'no', 'nobody', 'non', 'noone', 'not', 'nothing', 'now', 'nowhere', 'number', 'numbers', 'of', 'off', 'often', 'old', 'older', 'oldest', 'on', 'once', 'one', 'only', 'open', 'opened', 'opening', 'opens', 'or', 'order', 'ordered', 'ordering', 'orders', 'other', 'others', 'our', 'out', 'over', 'part', 'parted', 'parting', 'parts', 'per', 'perhaps', 'place', 'places', 'point', 'pointed', 'pointing', 'points', 'possible', 'present', 'presented', 'presenting', 'presents', 'problem', 'problems', 'put', 'puts', 'quite', 'rather', 'really', 'right', 'room', 'rooms', 'said', 'same', 'saw', 'say', 'says', 'second', 'seconds', 'see', 'seem', 'seemed', 'seeming', 'seems', 'sees', 'several', 'shall', 'she', 'should', 'show', 'showed', 'showing', 'shows', 'side', 'sides', 'since', 'small', 'smaller', 'smallest', 'so', 'some', 'somebody', 'someone', 'something', 'somewhere', 'state', 'states', 'still', 'such', 'sure', 'take', 'taken', 'than', 'that', 'the', 'their', 'them', 'then', 'there', 'therefore', 'these', 'they', 'thing', 'things', 'think', 'thinks', 'this', 'those', 'though', 'thought', 'thoughts', 'three', 'through', 'thus', 'to', 'today', 'together', 'too', 'took', 'toward', 'turn', 'turned', 'turning', 'turns', 'two', 'under', 'until', 'up', 'upon', 'us', 'use', 'used', 'uses', 'very', 'want', 'wanted', 'wanting', 'wants', 'was', 'way', 'ways', 'we', 'well', 'wells', 'went', 'were', 'what', 'when', 'where', 'whether', 'which', 'while', 'who', 'whole', 'whose', 'why', 'will', 'with', 'within', 'without', 'work', 'worked', 'working', 'works', 'would', 'year', 'years', 'yet', 'you', 'young', 'younger', 'youngest', 'your', 'yours', 
  // Common news boilerplate terms
  'news', 'breaking', 'report', 'video', 'watch', 'update', 'latest', 'story', 'time', 'more', 'details', 'published', 'read', 'share', 'youtube'
]);

export const generateTags = (title = '', content = '', category = '') => {
  const combinedText = `${title} ${title} ${content}`; // Weight title heavier by repeating it
  
  // Clean text and extract words
  const words = combinedText
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ') // Replace punctuation with space
    .split(/\s+/)
    .filter(word => word.length > 4 && !STOP_WORDS.has(word) && !/^\d+$/.test(word)); // length > 4 to get substantive words, ignore pure numbers

  // Count frequencies
  const freq = {};
  for (const word of words) {
    freq[word] = (freq[word] || 0) + 1;
  }

  // Extract top 3 keywords based on frequency
  let tags = Object.keys(freq).sort((a, b) => freq[b] - freq[a]).slice(0, 3);

  // Add category as a fallback/reinforcement tag if less than 3 tags found or as 4th tag
  if (category) {
    const catLower = category.toLowerCase();
    if (!tags.includes(catLower)) {
      tags.push(catLower);
    }
  }

  // Ensure unique and max 4 tags
  return [...new Set(tags)].slice(0, 4);
};
