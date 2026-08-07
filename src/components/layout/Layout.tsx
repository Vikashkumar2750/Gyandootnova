import Header from "./Header";
import Footer from "./Footer";
import FloatingWhatsApp from "@/components/FloatingWhatsApp";
<<<<<<< HEAD
import ExitIntentOffer from "@/components/ExitIntentOffer";
import EmailLeadCapture from "@/components/EmailLeadCapture";
import { useReferralCapture } from "@/hooks/useReferral";
import { useCustomScripts } from "@/hooks/useCustomScripts";

const Layout = ({ children }: { children: React.ReactNode }) => {
  useReferralCapture();
  useCustomScripts();

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex flex-col flex-1">{children}</main>
      <Footer />
      <FloatingWhatsApp />
      <ExitIntentOffer />
      <EmailLeadCapture />
    </div>
  );
};

export default Layout;
=======

const Layout = ({ children }: { children: React.ReactNode }) => (
  <div className="flex min-h-screen flex-col">
    <Header />
    <main className="flex flex-col flex-1">{children}</main>
    <Footer />
    <FloatingWhatsApp />
  </div>
);

export default Layout;

>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
