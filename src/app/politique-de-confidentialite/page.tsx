export default function PolitiqueDeConfidentialitePage() {
  return (
    <main className="min-h-screen bg-background px-6 py-24 text-white">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-3xl font-bold md:text-4xl">Politique de confidentialité</h1>

        <div className="mt-8 space-y-8 rounded-2xl border border-border bg-card/40 p-8 text-sm leading-7 text-muted-foreground">
          <section>
            <h2 className="text-lg font-semibold text-white">1. Collecte des données</h2>
            <p className="mt-2">
              Nous collectons les informations nécessaires à la création de votre compte et au traitement de vos commandes : email, nom, et historique des vidéos générées. Les données de paiement sont traitées exclusivement par Stripe.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">2. Utilisation des données</h2>
            <p className="mt-2">
              Vos données sont utilisées pour vous fournir l&apos;accès au service, gérer vos abonnements, et vous envoyer des informations relatives à votre compte. Nous ne vendons jamais vos données à des tiers.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">3. Cookies</h2>
            <p className="mt-2">
              Nous utilisons des cookies techniques nécessaires au fonctionnement du site et à votre authentification (via Supabase).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">4. Vos droits</h2>
            <p className="mt-2">
              Conformément au RGPD, vous disposez d&apos;un droit d&apos;accès, de rectification et de suppression de vos données personnelles. Vous pouvez exercer ce droit en nous contactant à : bibble.ai.contact@etik.com.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
