import Layout from "@/components/layout/Layout";
import useSEO from "@/hooks/useSEO";

const TermsConditions = () => {
  useSEO({
    title: "Terms & Conditions | GyandootNova",
    description: "GyandootNova ki Terms & Conditions — platform use karne ke rules, user responsibilities aur legal terms.",
    canonical: "/terms-conditions",
  });
  return (

    <Layout>
      <main className="container py-16 max-w-3xl mx-auto prose prose-neutral dark:prose-invert">
        <h1 className="font-serif text-4xl font-bold text-primary">Terms & Conditions</h1>
        <p className="text-muted-foreground">Last updated: February 2026</p>

        <h2>1. Acceptance of Terms</h2>
        <p>
          By accessing and using GyandootNova, you agree to be bound by these Terms & Conditions. If you do not agree, please do not use our platform.
        </p>

        <h2>2. Services</h2>
        <p>
          GyandootNova provides an online platform for reading spiritual books, articles, and programs. Books are available for online reading only and cannot be downloaded, printed, or redistributed.
        </p>

        <h2>3. User Accounts</h2>
        <ul>
          <li>You must provide accurate information when creating an account.</li>
          <li>You are responsible for maintaining the security of your account.</li>
          <li>One account per person is allowed.</li>
        </ul>

        <h2>4. Purchases & Payments</h2>
        <ul>
          <li>All payments are processed securely through Razorpay.</li>
          <li>Purchased books grant you a personal, non-transferable license to read online.</li>
          <li>Prices are listed in Indian Rupees (INR) unless stated otherwise.</li>
        </ul>

        <h2>5. Intellectual Property</h2>
        <p>
          All content on GyandootNova — including books, articles, images, and branding — is protected by copyright. Unauthorized reproduction, distribution, or commercial use is strictly prohibited.
        </p>

        <h2>6. Prohibited Conduct</h2>
        <ul>
          <li>Attempting to download, copy, or scrape content.</li>
          <li>Sharing account credentials with others.</li>
          <li>Using automated tools to access our platform.</li>
          <li>Any activity that disrupts our services.</li>
        </ul>

        <h2>7. Limitation of Liability</h2>
        <p>
          GyandootNova shall not be liable for any indirect, incidental, or consequential damages arising from your use of our services.
        </p>

        <h2>8. Changes to Terms</h2>
        <p>
          We reserve the right to modify these terms at any time. Continued use of the platform constitutes acceptance of updated terms.
        </p>

        <h2>9. Contact</h2>
        <p>
          For questions, contact us at <a href="mailto:gyandootnova57@gmail.com" className="text-primary">gyandootnova57@gmail.com</a>.
        </p>
      </main>
    </Layout>
  );
};

export default TermsConditions;
