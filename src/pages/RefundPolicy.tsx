import Layout from "@/components/layout/Layout";
import useSEO from "@/hooks/useSEO";

const RefundPolicy = () => {
  useSEO({
    title: "Refund Policy | GyandootNova",
    description: "GyandootNova ki Refund Policy — 7-din refund guarantee, eligibility aur process ki poori jaankari.",
    canonical: "/refund-policy",
  });
  return (

    <Layout>
      <main className="container py-16 max-w-3xl mx-auto prose prose-neutral dark:prose-invert">
        <h1 className="font-serif text-4xl font-bold text-primary">Refund & Cancellation Policy</h1>
        <p className="text-muted-foreground">Last updated: February 2026</p>

        <h2>1. Digital Book Purchases</h2>
        <p>
          Since GyandootNova provides digital content (online book reading), refund requests are handled on a case-by-case basis under the following conditions:
        </p>
        <ul>
          <li><strong>Eligible for Refund:</strong> If you request a refund within 7 days of purchase and have read less than 20% of the book.</li>
          <li><strong>Not Eligible:</strong> If more than 20% of the book has been accessed or the refund is requested after 7 days.</li>
        </ul>

        <h2>2. Donations</h2>
        <p>
          All donations made through GyandootNova are voluntary and non-refundable. Please ensure the correct amount before completing your donation.
        </p>

        <h2>3. Technical Issues</h2>
        <p>
          If you face technical issues preventing you from reading a purchased book, please contact our support team. We will resolve the issue or process a full refund.
        </p>

        <h2>4. How to Request a Refund</h2>
        <ol>
          <li>Email us at <a href="mailto:gyandootnova57@gmail.com" className="text-primary">gyandootnova57@gmail.com</a> with your purchase details.</li>
          <li>Include your registered email and order/payment ID.</li>
          <li>Our team will review and respond within 3-5 business days.</li>
        </ol>

        <h2>5. Refund Processing</h2>
        <p>
          Approved refunds will be credited to your original payment method within 7-10 business days. Refunds are processed through Razorpay.
        </p>

        <h2>6. Cancellation</h2>
        <p>
          There are no subscriptions to cancel. Each book purchase is a one-time transaction granting permanent online reading access.
        </p>
      </main>
    </Layout>
  );
};

export default RefundPolicy;
