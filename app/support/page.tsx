export default async function StudiesPage() {
  return (
    <div className="prose prose-sm dark:prose-invert pb-16 lg:pt-8">
      <h1>Get Support</h1>

      <h2>Online Support groups:</h2>
      <ul>
        <li>
          <a
            href="https://www.reddit.com/r/detrans/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Detrans Community on Reddit
          </a>
        </li>
        <li>
          <a
            href="https://www.reddit.com/r/detrans/wiki/support/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Detrans Wiki on Reddit
          </a>
        </li>
        <li>
          <a
            href="https://discord.com/invite/SXgyJ3BKZQ"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Official /r/detrans Discord Server
          </a>
        </li>
      </ul>
      <h2>Get one-on-one therapy:</h2>
      
      <h3>The Detrans Foundation</h3>
      <p>
        The Detrans Foundation provides resources and support for detransitioners, 
        including access to qualified therapists who understand detransition experiences.
      </p>
      
      <h4>Dr. Kirsty Entwistle</h4>
      <p>
        <a
          href="https://www.detransfoundation.com/dr-kirsty-entwistle.html"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          Dr. Kirsty Entwistle
        </a>{" "}
        is a Clinical Psychologist who previously worked at the NHS gender identity development 
        service for under 18s in Leeds. She is registered with the UK Health Care Professions 
        Council (HCPC) and offers online consultations by secure videocall.
      </p>
      
      <h4>Anastassis Spiliadis</h4>
      <p>
        <a
          href="https://www.detransfoundation.com/anastassis-spilliadis.html"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          Anastassis Spiliadis
        </a>{" "}
        is a Systemic & Family Psychotherapist who worked for four years at the Gender Identity 
        Development Service at the Tavistock, where he led the Family Therapy & Consultation Service. 
        He developed the Gender Exploratory Model and has extensive experience working with 
        gender-questioning individuals and detransitioners.
      </p>
    </div>
  );
}
