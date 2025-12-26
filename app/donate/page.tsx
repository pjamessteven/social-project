"use server";

import DonationBox from "../components/content/DonationBox";

export default async function DonationPage() {
  return (
    <div className="prose dark:prose-invert pb-16 lg:pt-8">
      <h2>Help Keep This Service Online!</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-1">
        <div className="">
          <p>
            If you appreciate the work that I have put into this site or if this
            free service has helped you, please consider making a one-off or
            regular donation to keep <b>detrans.ai</b> online.
          </p>
          <p>
            I can&apos;t afford to run a resource intensive service like this
            without your support. If I run out of money, the ability to ask your
            own questions and explore topics deeper through follow-up questions
            will be disabled and I will only serve cached responses to the
            questions in the portal.
          </p>
          <p>
            Please consider a monthly donation. You can donate using paypal
            below, directly to my New Zealand bank account or with BTC.
          </p>

          <div className="mt-8 flex max-w-[400px] items-center overflow-hidden rounded-xl bg-white shadow-md dark:bg-gray-800">
            <DonationBox />
          </div>
          <div className="mt-4 mb-4 flex max-w-md items-center space-x-1 rounded-xl bg-white px-4 shadow-md dark:bg-gray-800">
            <div className="mb-4 flex-1 font-mono break-all">
              <p className="text-sm font-medium opacity-70">
                New Zealand Bank Account
              </p>
              Name: PETER STEVEN
              <br /> Account: 38-9011-0035365-00 (KIWINZ22)
              <br /> SWIFT/BIC code: KIWINZ22
            </div>
          </div>
          <div className="flex max-w-md items-center space-x-1 rounded-xl bg-white px-4 shadow-md dark:bg-gray-800">
            <div className="flex-1">
              <p className="text-sm font-medium opacity-70">Bitcoin Address</p>
              <p id="btc-address" className="font-mono break-all">
                bc1qtag945t26vspn7gnh9vaczqpgpkgqwf0j2l4ys
              </p>
            </div>
          </div>
        </div>
        <div className=""></div>
      </div>
    </div>
  );
}
