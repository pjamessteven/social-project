"use server";

export default async function TermsPage() {
  return (
    <div className="prose dark:prose-invert pb-16 lg:pt-8">
      <h2>Privacy Policy</h2>
      <p>
        This Privacy Policy explains what information we collect, why we collect
        it, and how we keep it safe when you visit or use our service.
      </p>
      <ol>
        <li>
          <b>Information We Collect </b>
          <ol type="a">
            <li>
              <b>Cookies / Tracking Technologies: </b> <br />
              We do <em>not</em> use cookies, local storage, pixel tags, or any
              similar client-side tracking mechanisms.
            </li>
            <li>
              <b>IP Addresses: </b>
              <br />
              When you make a request to our servers we temporarily receive and
              store your IP address in volatile memory (typically for a day)
              solely to count requests and enforce rate limits that prevent
              abuse.
            </li>
            <li>
              <b>Optional Data: </b>
              <br />
              If you choose to contact us , we may collect the information you
              voluntarily supply (e.g., email address, name). Providing this
              information is optional unless explicitly stated.
            </li>
          </ol>
        </li>

        <li>
          <b>Legal Bases for Processing (EU/EEA visitors) </b>
          <ol type="a">
            <li>
              Rate-limit processing is necessary for our{" "}
              <em>legitimate interests</em> under GDPR Art. 6(1)(f) —
              specifically, maintaining service availability and security.
            </li>
            <li>
              Any additional processing (e.g., account creation) is based on
              your <em>consent</em> or <em>contractual necessity</em>, as
              applicable.
            </li>
          </ol>
        </li>

        <li>
          <b>How Long We Keep Data </b>
          <br />
          IP addresses used for rate limiting are automatically deleted within
          minutes after the last request or at the end of the rate-limit window,
          whichever comes first. Voluntary information (e.g., support emails) is
          retained only as long as needed to resolve your inquiry or satisfy
          legal obligations.
        </li>

        <li>
          <b>Third-Party Sharing </b>
          <br />
          We do not sell, rent, or trade your information. We may disclose IP
          addresses or other data only when required by law or to protect our
          rights, users, or the public (e.g., fraud prevention, court order).
        </li>

        <li>
          <b>Security </b>
          <br />
          We use industry-standard technical and organizational measures (TLS
          encryption, access controls, least-privilege design) to protect data
          in transit and at rest.
        </li>

        <li>
          <b>International Transfers </b>
          <br />
          Our servers are located in the United States. If you access the
          service from outside the U.S., you understand that your IP address
          will be transmitted to, and processed in, the United States.
        </li>

        <li>
          <b>Children’s Privacy </b>
          <br />
          Our service is not directed to children under 13, and we do not
          knowingly collect personal information from them. If you believe we
          have inadvertently collected such data, please contact us for
          immediate deletion.
        </li>

        <li>
          <b>Changes to This Policy </b> <br />
          We may update this policy from time to time. The “Effective Date” at
          the top will change, and significant changes will be posted
          prominently.
        </li>

        <li>
          <b>Contact Us </b> <br />
          If you have questions, concerns, or complaints, either use the contact
          form, or email <b>peter@detrans.ai </b>.
        </li>
      </ol>
    </div>
  );
}
