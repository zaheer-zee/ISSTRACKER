import { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, RefreshCw, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';

export default function NewsDashboard({ onNewsFetched }) {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('date'); // date, source

  const fetchNews = async (forceRefresh = false) => {
    try {
      setLoading(true);
      
      // Check localStorage cache (valid for 15 minutes)
      const cached = localStorage.getItem('news_cache');
      const cacheTime = localStorage.getItem('news_cache_time');
      const isCacheValid = cached && cacheTime && (Date.now() - parseInt(cacheTime) < 15 * 60 * 1000);

      if (!forceRefresh && isCacheValid) {
        const parsedArticles = JSON.parse(cached);
        setArticles(parsedArticles);
        if (onNewsFetched) onNewsFetched(parsedArticles);
        setLoading(false);
        return;
      }

      const apiKey = import.meta.env.VITE_NEWS_API_KEY;
      let url = 'https://saurav.tech/NewsAPI/top-headlines/category/general/us.json';
      let isNewsDataIO = false;
      
      if (apiKey && apiKey !== 'your_newsapi_key_here') {
        url = `https://newsdata.io/api/1/news?apikey=${apiKey}&language=en&country=us`;
        isNewsDataIO = true;
      }

      const res = await axios.get(url);
      let fetchedArticles = [];
      
      if (isNewsDataIO) {
        fetchedArticles = (res.data.results || []).map(article => ({
          title: article.title,
          urlToImage: article.image_url,
          source: { name: article.source_id || 'News' },
          publishedAt: article.pubDate,
          description: article.description,
          author: article.creator ? article.creator.join(', ') : '',
          url: article.link
        })).slice(0, 10);
      } else {
        fetchedArticles = res.data.articles.slice(0, 10);
      }

      // clean up articles with missing data
      fetchedArticles = fetchedArticles.filter(a => a.title && a.title !== '[Removed]');

      setArticles(fetchedArticles);
      localStorage.setItem('news_cache', JSON.stringify(fetchedArticles));
      localStorage.setItem('news_cache_time', Date.now().toString());
      if (onNewsFetched) onNewsFetched(fetchedArticles);
      
      if (forceRefresh) toast.success('News Refreshed');
    } catch (error) {
      console.error(error);
      toast.error('Failed to fetch news');
      // If error, try to load from cache even if expired
      const cached = localStorage.getItem('news_cache');
      if (cached) setArticles(JSON.parse(cached));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  const handleRefresh = () => fetchNews(true);

  // Filter and Sort
  let displayedArticles = articles.filter(a => 
    a.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (a.source.name && a.source.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (sortBy === 'date') {
    displayedArticles = displayedArticles.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  } else if (sortBy === 'source') {
    displayedArticles = displayedArticles.sort((a, b) => a.source.name.localeCompare(b.source.name));
  }

  // Show only 5 articles as requested: "Show 5 articles (total 10)"
  displayedArticles = displayedArticles.slice(0, 5);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 transition-colors flex flex-col h-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
          📰 Latest News
        </h2>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search news..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            />
          </div>
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="date">Latest First</option>
            <option value="source">By Source</option>
          </select>
          <button 
            onClick={handleRefresh}
            disabled={loading}
            className="p-2 bg-blue-100 hover:bg-blue-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-blue-600 dark:text-blue-400 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh News"
          >
            <RefreshCw className={loading ? "animate-spin" : ""} size={20} />
          </button>
        </div>
      </div>

      <div className="flex-grow overflow-y-auto pr-2 space-y-4">
        {loading && articles.length === 0 ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse flex flex-col sm:flex-row gap-4 border border-slate-100 dark:border-slate-700 p-4 rounded-lg">
                <div className="w-full sm:w-32 h-24 bg-slate-200 dark:bg-slate-700 rounded-md"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : displayedArticles.length > 0 ? (
          displayedArticles.map((article, idx) => (
            <div key={idx} className="group border border-slate-100 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-500 p-4 rounded-lg flex flex-col sm:flex-row gap-4 transition-all hover:shadow-md bg-white dark:bg-slate-800/50">
              {article.urlToImage && (
                <div className="w-full sm:w-40 h-32 flex-shrink-0 rounded-md overflow-hidden bg-slate-100 dark:bg-slate-700">
                  <img 
                    src={article.urlToImage} 
                    alt={article.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                </div>
              )}
              <div className="flex flex-col flex-grow">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded">
                    {article.source.name}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {new Date(article.publishedAt).toLocaleDateString()}
                  </span>
                </div>
                <h3 className="font-bold text-slate-800 dark:text-white line-clamp-2 mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {article.title}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2 mb-3">
                  {article.description || 'No description available for this article.'}
                </p>
                <div className="mt-auto flex justify-between items-center">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {article.author ? `By ${article.author}` : ''}
                  </span>
                  <a 
                    href={article.url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Read More <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-10 text-slate-500 dark:text-slate-400">
            No articles found. Try adjusting your search.
          </div>
        )}
      </div>
    </div>
  );
}
