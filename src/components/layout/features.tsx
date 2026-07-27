export function Features() {
  const features = [
    {
      title: "Avatars humains indétectables",
      description:
        "Finis les visages robotiques. Nos avatars IA ont des expressions, des clignotements d'yeux et des micro-mouvements si parfaits que vos prospects croiront voir un vrai créateur UGC.",
    },
    {
      title: "Clonage vocal haute conversion",
      description:
        "Des voix fluides, expressives et dynamiques qui brisent le \"scroll\" sur les réseaux. Multipliez vos hooks publicitaires en quelques clics et testez des dizaines d'intonations.",
    },
    {
      title: "Prêt pour TikTok, Reels & Shorts",
      description:
        "Passez du format vertical 9:16 pour vos réseaux mobiles au format 16:9 pour vos publicités YouTube et Facebook en un seul clic. Une seule idée, tous les placements.",
    },
    {
      title: "Zéro délai de production",
      description:
        "Plus besoin d'attendre 1 semaine qu'un créateur UGC vous envoie ses rushs. Générez, téléchargez et lancez vos nouvelles variantes d'Ads en moins de 5 minutes chrono.",
    },
    {
      title: "A/B testing de scripts illimité",
      description:
        "Modifiez un mot, changez votre offre ou testez un nouveau hook instantanément. Copiez-collez votre texte et laissez l'avatar l'incarner de manière ultra-convaincante.",
    },
    {
      title: "Flux de contenu continu",
      description:
        "Recevez votre pack de crédits automatiquement chaque mois pour alimenter vos campagnes. Testez de nouvelles variations d'écrans et d'offres en continu. Sans engagement, annulez quand vous voulez.",
    },
  ];

  return (
    <section id="features" className="py-20 md:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold md:text-4xl">
            Des créatives qui sortent plus vite. Et convertissent plus fort.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            Tout ce qu&apos;il faut pour produire, tester et renouveler vos publicités vidéos sans tournage, sans délais et sans dépendre d&apos;un créateur.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-border/50 bg-card/50 p-6 transition-all hover:border-primary/30 hover:bg-card"
            >
              <div className="mb-4 h-1.5 w-12 rounded-full bg-primary" />
              <h3 className="text-lg font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
