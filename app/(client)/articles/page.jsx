import connectToDB from "@/lib/db";
import Article from "@/models/Article";
import Settings from "@/models/Settings";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import ArticleCard from "@/components/ArticleCard";
import { Newspaper } from "lucide-react";

export const metadata = {
  title: "Articles | Sadiya Dawa College",
  description: "Read the latest articles from Sadiya Dawa College.",
};

export const dynamic = "force-dynamic";

async function getArticles() {
  await connectToDB();
  const articles = await Article.find({}).sort({ date: -1 }).lean();
  return JSON.parse(JSON.stringify(articles));
}

async function getSettings() {
  await connectToDB();
  const settings = await Settings.findOne().lean();
  return JSON.parse(JSON.stringify(settings));
}

export default async function ArticlesPage() {
  const articles = await getArticles();
  const settings = await getSettings();

  const institutionLogo = settings?.institution?.logo?.url;
  const updatesLogo = settings?.institution?.updatesLogo?.url;
  const orgLogo = settings?.org?.logo?.url;
  const institutionName = settings?.institution?.name || "Sadiya Dawa College";
  const orgName = settings?.org?.name || "Organisation";

  return (
    <div className="flex flex-col min-h-screen bg-gray-50/50">
      <PublicHeader 
        logo={null} 
        name={institutionName} 
        rightLogo={null}
        rightName={orgName}
        centered={true}
      />

      <main className="flex-1">
        {/* Hero Section - Super Slim with Balanced Logos */}
        <section className="bg-emerald-800 text-white py-1 px-6">
          <div className="max-w-7xl mx-auto flex flex-row items-center justify-between gap-4">
            {/* Institution Logo (Left) */}
            <div className="flex-1 flex justify-start">
              {institutionLogo && (
                <img 
                  src={institutionLogo} 
                  alt={institutionName} 
                  className="h-14 md:h-24 w-auto object-contain drop-shadow-lg"
                />
              )}
            </div>

            {/* Center Area */}
            <div className="flex-[2] flex flex-col items-center justify-center">
                <h1 className="text-2xl md:text-4xl font-bold tracking-wider text-white drop-shadow-md">ARTICLES</h1>
            </div>

            {/* Organisation Logo (Right) */}
            <div className="flex-1 flex justify-end">
              {orgLogo && (
                <img 
                  src={orgLogo} 
                  alt={orgName} 
                  className="h-14 md:h-24 w-auto object-contain drop-shadow-lg"
                />
              )}
            </div>
          </div>
        </section>

        {/* Articles List */}
        <section className="max-w-7xl mx-auto py-12 px-6">
          {articles.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-gray-100">
              <div className="bg-purple-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Newspaper className="w-8 h-8 text-purple-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">No articles yet</h2>
              <p className="text-gray-500 mt-2">Check back later for new publications.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {articles.map((article) => (
                <ArticleCard key={article._id} article={article} />
              ))}
            </div>
          )}
        </section>
      </main>

      <PublicFooter settings={settings} institutionName={institutionName} />
    </div>
  );
}
