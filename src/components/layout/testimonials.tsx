export function Testimonials() {
  const reviews = [
    {
      name: "Thomas",
      rating: 5,
      text: "Franchement bluffé. J'ai créé ma première vidéo publicitaire pour mon e-commerce en moins de 2 minutes. La synchronisation labiale de l'avatar est super propre et la voix anglaise fait ultra-naturelle. Ça me fait économiser des heures de tournage et de montage.",
    },
    {
      name: "Sarah",
      rating: 4,
      text: "Le concept est génial pour tester rapidement des hooks publicitaires sur TikTok sans avoir à me filmer. L'outil est super intuitif. J'enlève juste une petite étoile car j'aimerais avoir encore plus de choix d'avatars à l'avenir, mais pour le reste, c'est du solide !",
    },
    {
      name: "Maxime",
      rating: 5,
      text: "Idéal pour lancer des campagnes publicitaires en boucle. On tape notre script, on choisit notre voix, et la vidéo est prête instantanément. Nos coûts d'acquisition sur nos Reels ont bien baissé depuis qu'on utilise Bibble AI pour scaler nos créatifs.",
    },
  ];

  return (
    <section className="bg-secondary/30 py-20 md:py-28" id="temoignages">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold md:text-4xl">
            Ceux qui scalent déjà leurs créatives avec nous
          </h2>
          <div className="mt-4 mb-6 flex flex-row items-center justify-center gap-3">
            <span className="text-lg font-bold text-white">Excellent</span>
            <div className="flex h-8 items-center md:h-10">
              <img 
                src="/trustpilot.webp" 
                alt="Trustpilot" 
                className="h-full w-auto object-contain"
              />
            </div>
            <span className="text-sm md:text-base font-medium text-gray-300">Noté 4.8/5 sur Trustpilot</span>
          </div>
          <p className="mx-auto max-w-2xl text-lg text-gray-300">
            Découvrez pourquoi les e-commerçants et agences choisissent Bibble AI.
          </p>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {reviews.map((review, index) => (
            <div
              key={index}
              className="flex flex-col justify-between rounded-2xl border border-border bg-card p-8 shadow-sm transition-all duration-300 hover:border-primary/50 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5"
            >
              <div>
                <div className="mb-4 flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <svg
                      key={i}
                      className={`h-5 w-5 ${
                        i < review.rating ? "text-amber-400" : "text-muted-foreground/30"
                      }`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-base italic leading-relaxed text-foreground/90">
                  &quot;{review.text}&quot;
                </p>
              </div>
              <div className="mt-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                  {review.name[0]}
                </div>
                <span className="font-semibold">{review.name}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
