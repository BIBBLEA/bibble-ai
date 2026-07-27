export function HowItWorks() {
  const steps = [
    {
      number: "01",
      title: "Importez votre script",
      description:
        "Collez votre texte publicitaire (jusqu'à 400 caractères, idéal pour un format de 20 secondes). Intégrez votre hook le plus percutant, vos arguments de vente et votre appel à l'action.",
    },
    {
      number: "02",
      title: "Configurez votre acteur IA",
      description:
        "Sélectionnez l'avatar idéal pour incarner votre marque, choisissez l'intonation de la voix, et définissez le format adapté à votre campagne (9:16 pour TikTok/Reels ou 16:9 pour YouTube/Facebook).",
    },
    {
      number: "03",
      title: "Générez et lancez",
      description:
        "Cliquez sur générer. En moins de 5 minutes, votre vidéo publicitaire Haute Définition est prête à être téléchargée pour être directement propulsée sur vos gestionnaires de publicités.",
    },
  ];

  return (
    <section id="how-it-works" className="bg-card/30 py-20 md:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold md:text-4xl">
            Comment ça marche
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            Trois étapes pour transformer une idée en créative prête à lancer.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3">
          {steps.map((step, index) => (
            <div key={step.number} className="relative text-center">
              {index < steps.length - 1 && (
                <div className="absolute left-[60%] top-8 hidden h-0.5 w-[80%] bg-gradient-to-r from-primary/50 to-transparent md:block" />
              )}

              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border-2 border-primary bg-primary/10">
                <span className="text-xl font-bold text-primary">
                  {step.number}
                </span>
              </div>

              <h3 className="text-lg font-semibold">{step.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
