import { BadgeCheck, BookOpen, Users, ShieldCheck } from "lucide-react";

interface Props {
  author: string;
}

const AuthorCredibility = ({ author }: Props) => {
  return (
    <div className="mt-10 rounded-xl border border-primary/15 bg-gradient-to-br from-secondary/10 to-primary/5 p-5 sm:p-6">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-primary/15 text-primary flex items-center justify-center font-serif text-xl sm:text-2xl font-bold">
          {author?.[0] ?? "G"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-serif text-lg sm:text-xl font-bold text-foreground">{author || "The GyandootNova Editorial Board"}</h3>
            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-primary/15 text-primary">
              <BadgeCheck className="h-3.5 w-3.5" /> Verified Author
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Scriptures verified against authentic sources by experienced scholars and saint-editors. Original Sanskrit text with clear English meaning — the essence of generations of study.
          </p>
          <div className="mt-3 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-background/60 p-2 border border-primary/10">
              <div className="flex items-center justify-center gap-1 text-primary">
                <BookOpen className="h-4 w-4" />
                <span className="font-bold text-sm">200+</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Published titles</p>
            </div>
            <div className="rounded-lg bg-background/60 p-2 border border-primary/10">
              <div className="flex items-center justify-center gap-1 text-primary">
                <Users className="h-4 w-4" />
                <span className="font-bold text-sm">24k+</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Reader community</p>
            </div>
            <div className="rounded-lg bg-background/60 p-2 border border-primary/10">
              <div className="flex items-center justify-center gap-1 text-primary">
                <ShieldCheck className="h-4 w-4" />
                <span className="font-bold text-sm">100%</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Authentic sources</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthorCredibility;
