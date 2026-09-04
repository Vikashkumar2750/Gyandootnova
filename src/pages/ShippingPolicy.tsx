import Layout from "@/components/layout/Layout";
import useSEO from "@/hooks/useSEO";

const ShippingPolicy = () => {
  useSEO({
    title: "Shipping & Delivery Policy | GyandootNova",
    description: "GyandootNova ki Shipping & Delivery Policy — digital books instant access, physical delivery timelines aur charges.",
    canonical: "/shipping-policy",
  });
  return (

    <Layout>
      <main className="container py-16 max-w-3xl mx-auto prose prose-neutral dark:prose-invert">
        <h1 className="font-serif text-4xl font-bold text-primary">Shipping & Delivery Policy</h1>
        <p className="text-muted-foreground">Last updated: February 2026</p>

        <h2>1. Digital Delivery</h2>
        <p>
          GyandootNova is a digital-first platform. All books and content are delivered digitally and accessible for online reading immediately after purchase. There is no physical shipping involved.
        </p>

        <h2>2. Instant Access</h2>
        <p>
          Once your payment is successfully processed through Razorpay, the purchased book becomes instantly available in your account. You can start reading right away from any device with internet access.
        </p>

        <h2>3. Access Duration</h2>
        <p>
          Purchased books are accessible indefinitely through your GyandootNova account. There is no expiration on your reading access.
        </p>

        <h2>4. Free Content</h2>
        <p>
          Free books and articles are accessible immediately without any purchase. Simply create a free account to start reading.
        </p>

        <h2>5. Delivery Issues</h2>
        <p>
          If you've completed a payment but cannot access your purchased book, please:
        </p>
        <ol>
          <li>Refresh the page and check your account.</li>
          <li>Wait a few minutes — payment verification may take up to 5 minutes.</li>
          <li>If the issue persists, contact us at <a href="mailto:gyandootnova57@gmail.com" className="text-primary">gyandootnova57@gmail.com</a> with your payment ID.</li>
        </ol>

        <h2>6. No Physical Shipping</h2>
        <p>
          GyandootNova does not sell or ship physical books. All content is exclusively available for online reading on our platform.
        </p>
      </main>
    </Layout>
  );
};

export default ShippingPolicy;
