import Layout from "@/components/layout/Layout";
import useSEO from "@/hooks/useSEO";

const PrivacyPolicy = () => {
  useSEO({
    title: "Privacy Policy | GyandootNova",
    description: "GyandootNova ki Privacy Policy — hum aapka data kaise collect, use aur protect karte hain.",
    canonical: "/privacy-policy",
  });
  return (

    <Layout>
      <main className="container py-16 max-w-3xl mx-auto prose prose-neutral dark:prose-invert">
        <h1 className="font-serif text-4xl font-bold text-primary">Privacy Policy</h1>
        <p className="text-muted-foreground">Last updated: February 2026</p>

        <h2>1. Introduction</h2>
        <p>
          GyandootNova ("we", "our", "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your personal information when you use our website and services.
        </p>

        <h2>2. Information We Collect</h2>
        <ul>
          <li><strong>Account Information:</strong> Name, email address when you register.</li>
          <li><strong>Payment Information:</strong> Processed securely through Razorpay. We do not store your card details.</li>
          <li><strong>Usage Data:</strong> Pages visited, reading progress, and interaction data to improve our services.</li>
          <li><strong>Cookies:</strong> We use essential cookies for authentication and session management.</li>
        </ul>

        <h2>3. How We Use Your Information</h2>
        <ul>
          <li>To provide and maintain our services, including online book reading.</li>
          <li>To process purchases and donations.</li>
          <li>To send newsletters and updates (with your consent).</li>
          <li>To improve our platform and user experience.</li>
        </ul>

        <h2>4. Data Security</h2>
        <p>
          We implement industry-standard security measures to protect your data. All data transmissions are encrypted using SSL/TLS protocols.
        </p>

        <h2>5. Third-Party Services</h2>
        <p>
          We use Razorpay for payment processing. Their privacy policy governs the handling of payment data. We do not share your personal information with any other third parties.
        </p>

        <h2>6. Your Rights</h2>
        <p>
          You have the right to access, update, or delete your personal information at any time. Contact us at gyandootnova57@gmail.com for any privacy-related requests.
        </p>

        <h2>7. Contact Us</h2>
        <p>
          For questions about this Privacy Policy, please contact us at <a href="mailto:gyandootnova57@gmail.com" className="text-primary">gyandootnova57@gmail.com</a>.
        </p>
      </main>
    </Layout>
  );
};

export default PrivacyPolicy;
