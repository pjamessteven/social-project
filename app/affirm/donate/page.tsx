"use server";

import DonationBox from "@/app/components/content/DonationBox";

export default async function DonationPage() {
  return (
    <div className="prose dark:prose-invert pb-16 lg:pt-8">
      <h2>Keep Detrans.AI Running</h2>
      <div>
        <p>
          If you have the means to, please consider making a one-off or a
          regular donation to keep genderaffirming.ai running.
        </p>
        <p>
          I can&apos;t afford to run a resource intensive service like this
          without your support. My main income source at the moment is govermnet
          welfare and I&apos;m barely keeping my head above water. I have about
          $1000, and if this site blows up I could be getting bills for tens of
          thousands of dollars. If I run out of money, the ability to ask your
          own questions and explore topics deeper through follow-up questions
          will be disabled and I will only serve cached responses to the
          questions in the portal.
        </p>
      </div>
      <div className="">
        <DonationBox />
      </div>
    </div>
  );
}
