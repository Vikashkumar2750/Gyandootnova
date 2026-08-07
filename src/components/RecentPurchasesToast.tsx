import { useEffect, useState } from "react";
import { ShoppingBag, X } from "lucide-react";

const NAMES = [
  "Ravi Sharma", "Anita Verma", "Suresh Yadav", "Priya Gupta", "Manoj Tiwari",
  "Kavita Singh", "Amit Joshi", "Neha Agarwal", "Vikas Pandey", "Sneha Mishra",
  "Rahul Saxena", "Pooja Tripathi", "Deepak Chauhan", "Meera Devi", "Ajay Kumar",
  "Rachna Dubey", "Sanjay Rathore", "Geeta Behen", "Ashish Nayak", "Rekha Soni",
];

const CITIES = [
  "Jaipur", "Lucknow", "Varanasi", "Indore", "Patna", "Ahmedabad", "Bhopal",
  "Nagpur", "Kanpur", "Raipur", "Delhi", "Mumbai", "Pune", "Ranchi",
  "Dehradun", "Gorakhpur", "Ujjain", "Haridwar", "Nashik", "Amritsar",
];

const BOOKS = [
  "Shrimad Bhagavad Gita", "Ramcharitmanas", "Hanuman Chalisa Saar",
  "Upanishad Darshan", "Yoga Vashishtha", "Vishnu Purana",
  "Shrimad Bhagwatam", "Devi Mahatmya", "Narad Bhakti Sutra",
];

const TIMES = ["just now", "1 minute ago", "2 minutes ago", "5 minutes ago", "8 minutes ago", "12 minutes ago"];

const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

const RecentPurchasesToast = () => {
  const [item, setItem] = useState<null | { name: string; city: string; book: string; time: string }>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (dismissed) return;
    let alive = true;
    const show = () => {
      if (!alive) return;
      setItem({ name: pick(NAMES), city: pick(CITIES), book: pick(BOOKS), time: pick(TIMES) });
      setTimeout(() => alive && setItem(null), 6000);
    };
    const initial = setTimeout(show, 8000);
    const loop = setInterval(show, 22000);
    return () => {
      alive = false;
      clearTimeout(initial);
      clearInterval(loop);
    };
  }, [dismissed]);

  if (dismissed || !item) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-4 z-40 max-w-[300px] sm:max-w-xs animate-in slide-in-from-bottom-4 fade-in duration-500"
    >
      <div className="rounded-xl border border-primary/20 bg-card/95 backdrop-blur shadow-lg p-3 pr-8 flex gap-3">
        <div className="flex-shrink-0 h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center">
          <ShoppingBag className="h-4 w-4" />
        </div>
        <div className="text-xs leading-snug text-foreground">
          <p>
            <strong>{item.name}</strong> <span className="text-muted-foreground">({item.city})</span>
          </p>
          <p className="text-foreground/90">unlocked "{item.book}"</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">✓ Verified · {item.time}</p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          className="absolute top-1.5 right-1.5 p-1 text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};

export default RecentPurchasesToast;
