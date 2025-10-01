"use client";
import Script from "next/script";
export default function DonationBox() {
  return (
    <>
      <Script
        src="https://donorbox.org/widget.js"
        // @ts-expect-error Donorbox custom prop
        paypalExpress="false"
      ></Script>{" "}
      <iframe
        src="https://donorbox.org/embed/detrans-ai-donations-822696?"
        name="donorbox"
        // @ts-expect-error something
        allowpaymentrequest="allowpaymentrequest"
        seamless={true}
        frameBorder="0"
        scrolling="no"
        height="900px"
        width="100%"
        style={{
          maxWidth: "424px",
          minWidth: "250px",
          maxHeight: "none!important",
        }}
        allow="payment"
      ></iframe>
    </>
  );
}
