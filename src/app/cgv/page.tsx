export default function CGVPage() {
  return (
    <main className="min-h-screen bg-background px-6 py-24 text-white">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-3xl font-bold md:text-4xl">Conditions Générales de Vente</h1>

        <div className="mt-8 space-y-8 rounded-2xl border border-border bg-card/40 p-8 text-sm leading-7 text-muted-foreground">
          <section>
            <h2 className="text-lg font-semibold text-white">1. Objet</h2>
            <p className="mt-2">
              Les présentes Conditions Générales de Vente régissent l’achat de services numériques (création de vidéos par Intelligence Artificielle sous forme de crédits ou d&apos;abonnements) sur le site BIBBLE.AI.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">2. Prix et Paiement</h2>
            <p className="mt-2">
              Les prix de nos offres sont indiqués sur le site en Euros (€). Le paiement est exigible immédiatement au moment de la commande. Les paiements sont sécurisés et traités par notre partenaire Stripe. Aucune donnée bancaire n&apos;est stockée sur nos serveurs.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">3. Livraison du service</h2>
            <p className="mt-2">
              Les crédits ou accès à l&apos;outil de génération vidéo sont activés sur le compte du client immédiatement après la validation du paiement par Stripe.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">4. Absence de Droit de Rétractation</h2>
            <p className="mt-2">
              Conformément à l’article L.221-28 du Code de la consommation français, le droit de rétractation ne peut être exercé pour la fourniture de contenus numériques non fournis sur un support matériel dont l&apos;exécution a commencé après accord préalable exprès du consommateur. Par conséquent, aucun remboursement ne sera effectué une fois que les crédits ont été alloués ou utilisés, même partiellement.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">5. Responsabilité</h2>
            <p className="mt-2">
              L&apos;éditeur ne saurait être tenu responsable des pannes techniques liées à l&apos;hébergement ou de l&apos;usage fait par le client des vidéos générées via l&apos;outil.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">6. Utilisation du service et Propriété des contenus</h2>
            <div className="mt-2 space-y-3">
              <p>
                <strong className="text-white">Génération :</strong> Le client est le seul et unique responsable des textes, scripts et visuels qu&apos;il soumet à l&apos;IA pour générer sa vidéo.
              </p>
              <p>
                <strong className="text-white">Contenus interdits :</strong> Il est strictement interdit d&apos;utiliser le service pour créer des contenus illégaux, diffamatoires, haineux, ou portant atteinte aux droits d&apos;auteur de tiers. L&apos;éditeur se réserve le droit de supprimer un compte sans préavis en cas d&apos;abus.
              </p>
              <p>
                <strong className="text-white">Propriété :</strong> Le client est pleinement propriétaire de la vidéo finale générée et peut l&apos;utiliser à des fins commerciales.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">7. Droit applicable</h2>
            <p className="mt-2">
              Les présentes CGV sont soumises au droit français. En cas de litige, une solution amiable sera recherchée avant toute action judiciaire.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
