import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
<<<<<<< HEAD
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { LocaleProvider } from "@/hooks/useLocale";
import { useVisitorTracker } from "@/hooks/useVisitorTracker";



=======
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
import { lazy, Suspense } from "react";

// Only eagerly load the homepage
import Index from "./pages/Index";

<<<<<<< HEAD
// Dashboard sub-pages (small, imported eagerly to avoid lazy-default issue)
import {
  PurchasedBooks, FreeBooks, ContinueReading, Favorites, RecentlyViewed, ReadingHistory,
} from "./pages/dashboard/LibraryPages";
import { MyOrders, InvoicesPage, RefundStatus } from "./pages/dashboard/OrderPages";
import { ReadingDashboard, BadgesPage, ReadingCalendar, CertificatesPage } from "./pages/dashboard/ReadingPages";
import { MyReviews, MyBookmarks } from "./pages/dashboard/CommunityPages";
import { SpiritualHome, MeditationTimer, FestivalCalendar } from "./pages/dashboard/SpiritualPages";
import { NotificationsPage, SupportPage, PersonalizedPage } from "./pages/dashboard/MiscPages";
import { ReadingGoals, BirthdaySettings, SpiritualJourney, ReadingChallenge } from "./pages/dashboard/Phase2Pages";
import {
  FamilyLibrary, AudioBookPlayer, OfflineReading, BookQRCodes,
  ReadingInsights, ExclusiveContent,
} from "./pages/dashboard/Phase3Pages";

=======
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
// Lazy load all other pages for faster initial load
const Books = lazy(() => import("./pages/Books"));
const BookDetail = lazy(() => import("./pages/BookDetail"));
const BookReader = lazy(() => import("./pages/BookReader"));
const FileBookReader = lazy(() => import("./pages/FileBookReader"));
const Articles = lazy(() => import("./pages/Articles"));
const ArticleDetail = lazy(() => import("./pages/ArticleDetail"));
const Donate = lazy(() => import("./pages/Donate"));
const Auth = lazy(() => import("./pages/Auth"));
const Profile = lazy(() => import("./pages/Profile"));
const About = lazy(() => import("./pages/About"));
<<<<<<< HEAD
const OurStory = lazy(() => import("./pages/OurStory"));
=======
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
const Services = lazy(() => import("./pages/Services"));
const Contact = lazy(() => import("./pages/Contact"));
const FAQ = lazy(() => import("./pages/FAQ"));
const TestimonialsPage = lazy(() => import("./pages/TestimonialsPage"));
const Portfolio = lazy(() => import("./pages/Portfolio"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsConditions = lazy(() => import("./pages/TermsConditions"));
const Careers = lazy(() => import("./pages/Careers"));
const Support = lazy(() => import("./pages/Support"));
const RefundPolicy = lazy(() => import("./pages/RefundPolicy"));
const ShippingPolicy = lazy(() => import("./pages/ShippingPolicy"));
const SitemapPage = lazy(() => import("./pages/Sitemap"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const NotFound = lazy(() => import("./pages/NotFound"));
<<<<<<< HEAD
const Keywords = lazy(() => import("./pages/Keywords"));
const Library = lazy(() => import("./pages/Library"));
const OfferLanding = lazy(() => import("./pages/OfferLanding"));
const ClaimPurchase = lazy(() => import("./pages/ClaimPurchase"));
const FlipReader = lazy(() => import("./pages/FlipReader"));

// Dashboard
const DashboardLayout = lazy(() => import("./pages/dashboard/DashboardLayout"));
const DashboardHome = lazy(() => import("./pages/dashboard/DashboardHome"));


=======
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminBooks = lazy(() => import("./pages/admin/AdminBooks"));
const AdminPosts = lazy(() => import("./pages/admin/AdminPosts"));
const AdminDonations = lazy(() => import("./pages/admin/AdminDonations"));
const AdminPurchases = lazy(() => import("./pages/admin/AdminPurchases"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminCoupons = lazy(() => import("./pages/admin/AdminCoupons"));
const AdminReferrals = lazy(() => import("./pages/admin/AdminReferrals"));
<<<<<<< HEAD
const AdminAI = lazy(() => import("./pages/admin/AdminAI"));
const AdminScripts = lazy(() => import("./pages/admin/AdminScripts"));
const AdminAuthProviders = lazy(() => import("./pages/admin/AdminAuthProviders"));
const AdminEnquiries = lazy(() => import("./pages/admin/AdminEnquiries"));
const AdminLSI = lazy(() => import("./pages/admin/AdminLSI"));
const AdminAIProviders = lazy(() => import("./pages/admin/AdminAIProviders"));
const AdminApiTester = lazy(() => import("./pages/admin/AdminApiTester"));
const AdminVisitors = lazy(() => import("./pages/admin/AdminVisitors"));
const AdminIdentifiedVisitors = lazy(() => import("./pages/admin/AdminIdentifiedVisitors"));
const AdminSeoCommand = lazy(() => import("./pages/admin/AdminSeoCommand"));
const AdminTeam = lazy(() => import("./pages/admin/AdminTeam"));
const AdminContentAudit = lazy(() => import("./pages/admin/AdminContentAudit"));
const AdminSalesFunnel = lazy(() => import("./pages/admin/AdminSalesFunnel"));


// SEO content — sacred text hubs, Hindi meaning pages, meditation guides
const BhagavadGitaHub = lazy(() => import("./pages/texts/BhagavadGita"));
const VedasHub = lazy(() => import("./pages/texts/Vedas"));
const UpanishadsHub = lazy(() => import("./pages/texts/Upanishads"));
const RigVedaHub = lazy(() => import("./pages/texts/RigVeda"));
const UpanishadMeaningHindi = lazy(() => import("./pages/hindi/UpanishadMeaningHindi"));
const VedasMeaningHindi = lazy(() => import("./pages/hindi/VedasMeaningHindi"));
const DhyanKaiseKarein = lazy(() => import("./pages/hindi/DhyanKaiseKarein"));
const HowToReadBhagavadGita = lazy(() => import("./pages/how-to-read/HowToReadBhagavadGita"));
const TechniquesCompared = lazy(() => import("./pages/meditation/TechniquesCompared"));
const MeditationForAnxiety = lazy(() => import("./pages/meditation/MeditationForAnxiety"));
const MeditationForStress = lazy(() => import("./pages/meditation/MeditationForStress"));

// Q&A pages (high-volume long-tail search targets)
const QAWhoWroteBhagavadGita = lazy(() => import("./pages/qa/WhoWroteBhagavadGita"));
const QAWhoWroteVedas = lazy(() => import("./pages/qa/WhoWroteVedas"));
const QAHowManyVedas = lazy(() => import("./pages/qa/HowManyVedas"));
const QAHowManyUpanishads = lazy(() => import("./pages/qa/HowManyUpanishads"));
const QAHowManySlokas = lazy(() => import("./pages/qa/HowManySlokasInBhagavadGita"));
const YatharthGeetaVsBhagavadGita = lazy(() => import("./pages/compare/YatharthGeetaVsBhagavadGita"));
const GitaPressVsIskconGita = lazy(() => import("./pages/compare/GitaPressVsIskconGita"));
const BestHindiBhagavadGitaTranslation = lazy(() => import("./pages/compare/BestHindiBhagavadGitaTranslation"));
const RamcharitmanasVsValmikiRamayan = lazy(() => import("./pages/compare/RamcharitmanasVsValmikiRamayan"));
=======
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4

// Minimal loading spinner
const PageLoader = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
  </div>
);

const queryClient = new QueryClient();

<<<<<<< HEAD
const AppContent = () => {
  useVisitorTracker();




  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <LocaleProvider>
            
            <Toaster />
            <Sonner />
            <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/books" element={<Books />} />
                <Route path="/books/:slug" element={<BookDetail />} />
                <Route path="/library" element={<Navigate to="/dashboard/library/continue" replace />} />

                <Route path="/books/:slug/read-file" element={<FileBookReader />} />
                <Route path="/offer/:slug" element={<OfferLanding />} />
                <Route path="/claim/:token" element={<ClaimPurchase />} />

                <Route path="/books/:slug/:chapterSlug" element={<BookReader />} />
                <Route path="/read/:slug/flip" element={<FlipReader />} />
                <Route path="/articles" element={<Articles />} />
                <Route path="/articles/:slug" element={<ArticleDetail />} />
                <Route path="/support-us" element={<Donate />} />
                <Route path="/donate" element={<Donate />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/profile" element={<Navigate to="/dashboard/profile" replace />} />

                {/* User Dashboard */}
                <Route path="/dashboard" element={<DashboardLayout />}>
                  <Route index element={<DashboardHome />} />
                  <Route path="profile" element={<Profile />} />
                  <Route path="profile/birthday" element={<BirthdaySettings />} />
                  <Route path="personalized" element={<PersonalizedPage />} />

                  <Route path="library" element={<PurchasedBooks />} />
                  <Route path="library/free" element={<FreeBooks />} />
                  <Route path="library/continue" element={<ContinueReading />} />
                  <Route path="library/favorites" element={<Favorites />} />
                  <Route path="library/recent" element={<RecentlyViewed />} />
                  <Route path="library/history" element={<ReadingHistory />} />

                  <Route path="orders" element={<MyOrders />} />
                  <Route path="orders/invoices" element={<InvoicesPage />} />
                  <Route path="orders/refunds" element={<RefundStatus />} />

                  <Route path="reading" element={<ReadingDashboard />} />
                  <Route path="reading/goals" element={<ReadingGoals />} />
                  <Route path="reading/challenge" element={<ReadingChallenge />} />
                  <Route path="reading/badges" element={<BadgesPage />} />
                  <Route path="reading/calendar" element={<ReadingCalendar />} />
                  <Route path="reading/certificates" element={<CertificatesPage />} />

                  <Route path="community/reviews" element={<MyReviews />} />
                  <Route path="community/bookmarks" element={<MyBookmarks />} />

                  <Route path="spiritual" element={<SpiritualHome />} />
                  <Route path="spiritual/meditation" element={<MeditationTimer />} />
                  <Route path="spiritual/festivals" element={<FestivalCalendar />} />
                  <Route path="spiritual/journey" element={<SpiritualJourney />} />

                  <Route path="family" element={<FamilyLibrary />} />
                  <Route path="audio" element={<AudioBookPlayer />} />
                  <Route path="offline" element={<OfflineReading />} />
                  <Route path="qr-codes" element={<BookQRCodes />} />
                  <Route path="insights" element={<ReadingInsights />} />
                  <Route path="exclusive" element={<ExclusiveContent />} />

                  <Route path="notifications" element={<NotificationsPage />} />
                  <Route path="support" element={<SupportPage />} />
                </Route>

                <Route path="/my-library" element={<Navigate to="/dashboard" replace />} />
                <Route path="/about" element={<About />} />
                <Route path="/our-story" element={<OurStory />} />
                <Route path="/story" element={<Navigate to="/our-story" replace />} />
                <Route path="/services" element={<Services />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/faq" element={<FAQ />} />
                <Route path="/testimonials" element={<TestimonialsPage />} />
                <Route path="/portfolio" element={<Portfolio />} />
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                <Route path="/terms-conditions" element={<TermsConditions />} />
                <Route path="/careers" element={<Careers />} />
                <Route path="/support" element={<Support />} />
                <Route path="/refund-policy" element={<RefundPolicy />} />
                <Route path="/shipping-policy" element={<ShippingPolicy />} />
                <Route path="/sitemap" element={<SitemapPage />} />
                <Route path="/keywords" element={<Keywords />} />

                {/* SEO content pages */}
                <Route path="/texts/bhagavad-gita" element={<BhagavadGitaHub />} />
                <Route path="/texts/vedas" element={<VedasHub />} />
                <Route path="/texts/upanishads" element={<UpanishadsHub />} />
                <Route path="/texts/rig-veda" element={<RigVedaHub />} />
                <Route path="/texts/rigveda" element={<Navigate to="/texts/rig-veda" replace />} />
                <Route path="/hindi/upanishad-meaning-in-hindi" element={<UpanishadMeaningHindi />} />
                <Route path="/hindi/vedas-meaning-in-hindi" element={<VedasMeaningHindi />} />
                <Route path="/hindi/dhyan-kaise-karein" element={<DhyanKaiseKarein />} />
                <Route path="/how-to-read/bhagavad-gita" element={<HowToReadBhagavadGita />} />
                <Route path="/meditation/techniques-compared" element={<TechniquesCompared />} />
                <Route path="/meditation/for-anxiety" element={<MeditationForAnxiety />} />
                <Route path="/meditation/for-stress" element={<MeditationForStress />} />

                {/* Q&A long-tail pages */}
                <Route path="/qa/who-wrote-bhagavad-gita" element={<QAWhoWroteBhagavadGita />} />
                <Route path="/qa/who-wrote-vedas" element={<QAWhoWroteVedas />} />
                <Route path="/qa/how-many-vedas" element={<QAHowManyVedas />} />
                <Route path="/qa/how-many-upanishads" element={<QAHowManyUpanishads />} />
                <Route path="/qa/how-many-slokas-in-bhagavad-gita" element={<QAHowManySlokas />} />
                <Route path="/compare/yatharth-geeta-vs-bhagavad-gita" element={<YatharthGeetaVsBhagavadGita />} />
                <Route path="/compare/gita-press-vs-iskcon-gita" element={<GitaPressVsIskconGita />} />
                <Route path="/compare/best-hindi-bhagavad-gita-translation" element={<BestHindiBhagavadGitaTranslation />} />
                <Route path="/compare/ramcharitmanas-vs-valmiki-ramayan" element={<RamcharitmanasVsValmikiRamayan />} />
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<AdminDashboard />} />
                  <Route path="users" element={<AdminUsers />} />
                  <Route path="books" element={<AdminBooks />} />
                  <Route path="posts" element={<AdminPosts />} />
                  <Route path="coupons" element={<AdminCoupons />} />
                  <Route path="donations" element={<AdminDonations />} />
                  <Route path="purchases" element={<AdminPurchases />} />
                  <Route path="referrals" element={<AdminReferrals />} />
                  <Route path="ai" element={<AdminAI />} />
                  <Route path="scripts" element={<AdminScripts />} />
                  <Route path="auth-providers" element={<AdminAuthProviders />} />
                  <Route path="enquiries" element={<AdminEnquiries />} />
                  <Route path="lsi" element={<AdminLSI />} />
                  <Route path="ai-providers" element={<AdminAIProviders />} />
                  <Route path="api-tester" element={<AdminApiTester />} />
                  <Route path="visitors" element={<AdminVisitors />} />
                  <Route path="identified-visitors" element={<AdminIdentifiedVisitors />} />
                  <Route path="seo-command" element={<AdminSeoCommand />} />
                  <Route path="team" element={<AdminTeam />} />
                  <Route path="content-audit" element={<AdminContentAudit />} />
                  <Route path="settings" element={<AdminSettings />} />
                  <Route path="sales-funnel" element={<AdminSalesFunnel />} />


                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
              </Suspense>
            </BrowserRouter>
          </LocaleProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

const App = () => <AppContent />;
=======
const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/books" element={<Books />} />
              <Route path="/books/:slug" element={<BookDetail />} />
              <Route path="/books/:slug/read-file" element={<FileBookReader />} />
              <Route path="/books/:slug/:chapterSlug" element={<BookReader />} />
              <Route path="/articles" element={<Articles />} />
              <Route path="/articles/:slug" element={<ArticleDetail />} />
              <Route path="/support-us" element={<Donate />} />
              <Route path="/donate" element={<Donate />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/about" element={<About />} />
              <Route path="/services" element={<Services />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/testimonials" element={<TestimonialsPage />} />
              <Route path="/portfolio" element={<Portfolio />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/terms-conditions" element={<TermsConditions />} />
              <Route path="/careers" element={<Careers />} />
              <Route path="/support" element={<Support />} />
              <Route path="/refund-policy" element={<RefundPolicy />} />
              <Route path="/shipping-policy" element={<ShippingPolicy />} />
              <Route path="/sitemap" element={<SitemapPage />} />
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="books" element={<AdminBooks />} />
                <Route path="posts" element={<AdminPosts />} />
                <Route path="coupons" element={<AdminCoupons />} />
                <Route path="donations" element={<AdminDonations />} />
                <Route path="purchases" element={<AdminPurchases />} />
                <Route path="referrals" element={<AdminReferrals />} />
                <Route path="settings" element={<AdminSettings />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4

export default App;
