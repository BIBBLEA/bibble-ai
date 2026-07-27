export default function MentionsLegalesPage() {
  return (
    <main className="min-h-screen bg-background px-6 py-24 text-white">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-3xl font-bold md:text-4xl">Mentions légales</h1>

        <div className="mt-8 space-y-8 rounded-2xl border border-border bg-card/40 p-8 text-sm leading-7 text-muted-foreground">
          <section>
            <h2 className="text-lg font-semibold text-white">1. Édition du site</h2>
            <p className="mt-2">
              Le site BIBBLE.AI est édité par la société BIBBLE AI, dont le siège social est situé en France. Pour toute question, vous pouvez nous contacter à l&apos;adresse email : bibble.ai.contact@etik.com.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">2. Hébergement</h2>
            <p className="mt-2">
              Le site est hébergé par Vercel Inc., situé au 340 S Lemon Ave #4133 Walnut, CA 91789, USA. Les données de base de données sont hébergées par Supabase (AWS Europe).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">3. Propriété intellectuelle</h2>
            <p className="mt-2">
              L&apos;ensemble des éléments constituant le site (textes, graphismes, logiciels, photographies, images, vidéos, sons, plans, noms, logos, marques, créations et œuvres protégeables diverses, bases de données, etc.) ainsi que le site lui-même, relèvent des législations françaises et internationales sur le droit d&apos;auteur et la propriété intellectuelle.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">4. Utilisation de l&apos;Intelligence Artificielle</h2>
            <p className="mt-2">
              Le service utilise des technologies d&apos;Intelligence Artificielle tierces (HeyGen API) pour la génération de vidéos. L&apos;utilisateur est responsable des contenus générés à partir de ses propres scripts.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
