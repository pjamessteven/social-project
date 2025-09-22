"use client";
import { useEffect, useRef } from "react";
import RedditEmbed from "./RedditEmbed";

const DETRANS_EMBEDS = [
  /*
  {
    title: "what can I do to make my face more feminine??",
    url: "https://www.reddit.com/r/detrans/comments/1nedhq4/what_can_i_do_to_make_my_face_more_feminine/",
    user: "u/monchevy",
    userUrl: "https://www.reddit.com/user/monchevy/",
    sub: "detrans",
    subUrl: "https://www.reddit.com/r/detrans/",
  },
  */
  {
    title: "Me, 2016 vs. 2 years off estrogen",
    url: "https://www.reddit.com/r/detrans/comments/frxfyc/me_2015_vs_2019_1_year_off_estrogen/",
    imageUrl: "https://i.redd.it/423423t93vp41.jpg",
    user: "u/ResetEarthPlz",
    userUrl: "https://www.reddit.com/user/ResetEarthPlz/",
    sub: "detrans",
    subUrl: "https://www.reddit.com/r/detrans/",
  },

  {
    title:
      "i finally can go every day without thinking about the fact that i've detransitioned, i feel beautiful. almost 2 years off T",
    url: "https://www.reddit.com/r/detrans/comments/prkixg/i_finally_can_go_every_day_without_thinking_about/",
    imageUrl: "https://i.redd.it/pheykb0l5ko71.jpg",
    user: "u/smallandfrail",
    userUrl: "https://www.reddit.com/user/smallandfrail/",
    sub: "detrans",
    subUrl: "https://www.reddit.com/r/detrans/",
  },
  {
    title:
      "4 months off HRT; apparently the physical appearance of my body has no bearing on who I am as a person or the happiness I can have 🤷",
    url: "https://www.reddit.com/r/detrans/comments/ndnyv5/4_months_off_hrt_apparently_the_physical/",
    imageUrl: "https://i.redd.it/q2k4wsidehz61.jpg",
    user: "u/sentientmassofenergy",
    userUrl: "https://www.reddit.com/user/sentientmassofenergy/",
    sub: "detrans",
    subUrl: "https://www.reddit.com/r/detrans/",
  },
  {
    title:
      "5 years ago today, I made the decision to “go back” ; Day 1 to Day 1825 living as the self I was made to be✨",
    url: "https://www.reddit.com/r/detrans/comments/rtiph1/5_years_ago_today_i_made_the_decision_to_go_back/",
    imageUrl: "https://i.redd.it/qzva60tnn2981.jpg",
    user: "u/skinnyguac",
    userUrl: "https://www.reddit.com/user/skinnyguac/",
    sub: "detrans",
    subUrl: "https://www.reddit.com/r/detrans/",
  },
  {
    title:
      "3 months off estrogen, life may still be hard, but I'm at peace with myself",
    url: "https://www.reddit.com/r/detrans/comments/gy1rgv/3_months_off_estrogen_life_may_still_be_hard_but/",
    imageUrl: "https://i.redd.it/6hvpcdqond351.jpg",
    user: "u/[deleted]",
    userUrl: "",
    sub: "detrans",
    subUrl: "https://www.reddit.com/r/detrans/",
  },
  {
    title:
      "The first pic was taken after I got out of the hospital after my suicide attempt. The second picture is me now.",
    url: "https://www.reddit.com/r/detrans/comments/eszlq3/the_first_pic_was_taken_after_i_got_out_of_the/",
    imageUrl: "https://i.redd.it/z7oty739hlc41.jpg",
    user: "u/[deleted]",
    userUrl: "",
    sub: "detrans",
    subUrl: "https://www.reddit.com/r/detrans/",
  },
  {
    title:
      "8 months off estrogen. I was transitioning for 4-5 years and felt like I was digging myself into a lifetime of misery.",
    url: "https://www.reddit.com/r/detrans/comments/h0qud8/8_months_off_estrogen_i_was_transitioning_for_45/",
    imageUrl: "https://i.redd.it/vzq00z1n67451.jpg",
    user: "u/veamoth",
    userUrl: "https://www.reddit.com/user/veamoth/",
    sub: "detrans",
    subUrl: "https://www.reddit.com/r/detrans/",
  },

  {
    title:
      "Saw the pic on the left in my Snapchat memories and realized I was wearing the same sweater. One year difference.",
    url: "https://www.reddit.com/r/detrans/comments/eftbxa/saw_the_pic_on_the_left_in_my_snapchat_memories/",
    imageUrl: "https://i.redd.it/2ixot89x1y641.jpg",
    user: "u/ali-pal",
    userUrl: "https://www.reddit.com/user/ali-pal/",
    sub: "detrans",
    subUrl: "https://www.reddit.com/r/detrans/",
  },
  {
    title:
      "3 months on T to 3.5 years living as detrans. Reclaiming my femininity was one of the most difficult, but rewarding things I've ever done.",
    url: "https://www.reddit.com/r/detrans/comments/itn2im/3_months_on_t_to_35_years_living_as_detrans/",
    imageUrl: "https://i.redd.it/6tsmbe7z8fn51.jpg",
    user: "u/skinnyguac",
    userUrl: "https://www.reddit.com/user/skinnyguac/",
    sub: "detrans",
    subUrl: "https://www.reddit.com/r/detrans/",
  },
  {
    title: "3 years on T vs 3 months off",
    url: "https://www.reddit.com/r/detrans/comments/e0m0ty/3_years_on_t_vs_3_months_off/",
    imageUrl: "https://i.redd.it/fgt9kjuwdh041.jpg",
    user: "u/ali-pal",
    userUrl: "https://www.reddit.com/user/ali-pal/",
    sub: "detrans",
    subUrl: "https://www.reddit.com/r/detrans/",
  },
  {
    title: "Wow. My face is still changing, patience is key!",
    url: "https://www.reddit.com/r/detrans/comments/1gglhu7/wow_my_face_is_still_changing_patience_is_key/",
    imageUrl: "https://i.redd.it/b889fmvxx4yd1.jpeg",
    user: "u/Euphoric-Slice-6266",
    userUrl: "https://www.reddit.com/user/Euphoric-Slice-6266/",
    sub: "detrans",
    subUrl: "https://www.reddit.com/r/detrans/",
  },
  {
    title:
      "Saw the pic on the left in my Snapchat memories and realized I was wearing the same sweater. One year difference.",
    url: "https://www.reddit.com/r/detrans/comments/eftbxa/saw_the_pic_on_the_left_in_my_snapchat_memories/",
    imageUrl: "https://i.redd.it/2ixot89x1y641.jpg",
    user: "u/ali-pal",
    userUrl: "https://www.reddit.com/user/ali-pal/",
    sub: "detrans",
    subUrl: "https://www.reddit.com/r/detrans/",
  },
  {
    title: "Lil update! 1.6 year after stopping T (after 7 years on it)",
    url: "https://www.reddit.com/r/detrans/comments/y30cd9/lil_update_16_year_after_stopping_t_after_7_years/",
    imageUrl: "https://i.redd.it/wwhnuurq3lt91.jpg",
    user: "u/manouxoxo",
    userUrl: "https://www.reddit.com/user/manouxoxo/",
    sub: "detrans",
    subUrl: "https://www.reddit.com/r/detrans/",
  },
  {
    title: "I was trans and miserable for 7 years. I had many...",
    url: "https://www.reddit.com/r/detrans/comments/11ldt9r/i_was_trans_and_miserable_for_7_years_i_had_many/",
    imageUrl: "https://i.redd.it/xt0r2bc6rfma1.jpg",
    user: "unknown",
    userUrl: "",
    sub: "detrans",
    subUrl: "https://www.reddit.com/r/detrans/",
  },
  {
    title:
      "~9 months off T. I'm realizing how much of my desire to be a man was rooted in misogyny...",
    url: "https://www.reddit.com/r/detrans/comments/qpnph9/9_months_off_t_im_realizing_how_much_of_my_desire/",
    imageUrl: "https://i.redd.it/z0djse6hwfy71.jpg",
    user: "u/[deleted]",
    userUrl: "",
    sub: "detrans",
    subUrl: "https://www.reddit.com/r/detrans/",
  },
  {
    title:
      "Butch lesbian 2 yrs 2 months off t after 7 years on, embracing my female masculinity :)",
    url: "https://www.reddit.com/r/detrans/comments/1lg8xym/butch_lesbian_2_yrs_2_months_off_t_after_7_years/",
    imageUrl: "https://i.redd.it/qonp9mpw348f1.jpg",
    user: "u/Euphoric-Slice-6266",
    userUrl: "https://www.reddit.com/user/Euphoric-Slice-6266/",
    sub: "detrans",
    subUrl: "https://www.reddit.com/r/detrans/",
  },
  {
    title:
      "for the rare male detransitioners here: femininity in manhood is nothing to be ashamed of 💕",
    url: "https://www.reddit.com/r/detrans/comments/1ad1qlq/for_the_rare_male_detransitioners_here_femininity/",
    imageUrl:
      "https://preview.redd.it/for-the-rare-male-detransitioners-here-femininity-in-v0-e7evrif7e6fc1.jpg?width=1080&crop=smart&auto=webp&s=4d2be331783b32a632e65a6f06767c435077e9e0",
    user: "u/femmixo",
    userUrl: "https://www.reddit.com/user/femmixo/",
    sub: "detrans",
    subUrl: "https://www.reddit.com/r/detrans/",
  },

  {
    title:
      "Came out as a detrans butch to friends and family and it went well, 3.5 months off t and feeling hopeful :)",
    url: "https://www.reddit.com/r/detrans/comments/15fcvuu/came_out_as_a_detrans_butch_to_friends_and_family/",
    imageUrl: "https://i.redd.it/z3v4fv395ifb1.jpg",
    user: "u/Euphoric-Slice-6266",
    userUrl: "https://www.reddit.com/user/Euphoric-Slice-6266/",
    sub: "detrans",
    subUrl: "https://www.reddit.com/r/detrans/",
  },

  {
    title: "It's been a wild ride (2011, 2019, 2021)",
    url: "https://www.reddit.com/r/detrans/comments/wbnebf/its_been_a_wild_ride_2011_2019_2021/",
    imageUrl: "https://i.redd.it/wgc5itd9ime91.jpg",
    user: "u/lonelycyborg",
    userUrl: "https://www.reddit.com/user/lonelycyborg/",
    sub: "detrans",
    subUrl: "https://www.reddit.com/r/detrans/",
  },

  {
    title:
      "What realisations made you choose to detransition? Mines was that makeup is not gendered and males too can wear mascara 😁",
    url: "https://www.reddit.com/r/detrans/comments/z0hi5f/what_realisations_made_you_choose_to_detransition/",
    imageUrl: "https://i.redd.it/97ix8fh4581a1.jpg",
    user: "u/lifeson488",
    userUrl: "https://www.reddit.com/user/lifeson488/",
    sub: "detrans",
    subUrl: "https://www.reddit.com/r/detrans/",
  },

  {
    title: "just visited r/detrans. what the fuck?",
    url: "https://www.reddit.com/r/ftm/comments/1dco0n7/just_visited_rdetrans_what_the_fuck/",
    user: "u/[deleted]",
    userUrl: "",
    sub: "ftm",
    subUrl: "https://www.reddit.com/r/ftm/",
  },
  {
    title:
      "I made the mistake to scroll through detrans subs. Now I'm freaking out.",
    url: "https://www.reddit.com/r/MtF/comments/18dlxj5/i_made_the_mistake_to_scroll_through_detrans_subs/",
    user: "u/TvManiac5",
    userUrl: "https://www.reddit.com/user/TvManiac5/",
    sub: "MtF",
    subUrl: "https://www.reddit.com/r/MtF/",
  },
];
/*
const TRANS_EMBEDS = [
  {
    title: "Feeling good about this morning's selfie",
    url: "https://www.reddit.com/r/MtF/comments/5ultti/feeling_good_about_this_mornings_selfie/",
    user: "u/AmeliaLeah",
    userUrl: "https://www.reddit.com/user/AmeliaLeah/",
    sub: "MtF",
    subUrl: "https://www.reddit.com/r/MtF/",
  },
  {
    title:
      "I got contacts yesterday just in time to join the selfie train (21, 6.5 mos hrt).",
    url: "https://www.reddit.com/r/MtF/comments/5zcdf6/i_got_contacts_yesterday_just_in_time_to_join_the/",
    user: "u/Generis_Targaryen",
    userUrl: "https://www.reddit.com/user/Generis_Targaryen/",
    sub: "MtF",
    subUrl: "https://www.reddit.com/r/MtF/",
  },

  {
    title: "2.5+ years on T and I finally have a beard to show for it 😭😊",
    url: "https://www.reddit.com/r/ftm/comments/9nfj68/25_years_on_t_and_i_finally_have_a_beard_to_show/",
    user: "u/douglyjohnny",
    userUrl: "https://www.reddit.com/user/douglyjohnny/",
    sub: "ftm",
    subUrl: "https://www.reddit.com/r/ftm/",
  },
  {
    title:
      "Have been feeling pretty dysphoric lately but found a selfie from this time last year and I feel a bit better about my progress now :-)",
    url: "https://www.reddit.com/r/ftm/comments/9quu2l/have_been_feeling_pretty_dysphoric_lately_but/",
    user: "u/[deleted]",
    userUrl: "",
    sub: "ftm",
    subUrl: "https://www.reddit.com/r/ftm/",
  },
  {
    title:
      "Bit late but still wanted to join the selfie train :D (20, 5months hrt) (Also, first post yay)",
    url: "https://www.reddit.com/r/MtF/comments/5ganri/bit_late_but_still_wanted_to_join_the_selfie/",
    user: "u/Ghostiyra",
    userUrl: "https://www.reddit.com/user/Ghostiyra/",
    sub: "MtF",
    subUrl: "https://www.reddit.com/r/MtF/",
  },
  {
    title: "83 days of HRT, time for another selfie",
    url: "https://www.reddit.com/r/MtF/comments/5sd8vh/83_days_of_hrt_time_for_another_selfie/",
    user: "u/[deleted]",
    userUrl: "",
    sub: "MtF",
    subUrl: "https://www.reddit.com/r/MtF/",
  },
  {
    title: "Pre-T vs 2 years T selfies with my mom!",
    url: "https://www.reddit.com/r/ftm/comments/98i8mi/pret_vs_2_years_t_selfies_with_my_mom/",
    user: "u/stealthb0y",
    userUrl: "https://www.reddit.com/user/stealthb0y/",
    sub: "ftm",
    subUrl: "https://www.reddit.com/r/ftm/",
  },
  {
    title:
      "today is my One Year Manniversary! comparison selfies to celebrate!",
    url: "https://www.reddit.com/r/ftm/comments/5ilhmi/today_is_my_one_year_manniversary_comparison/",
    user: "u/daftalchemist",
    userUrl: "https://www.reddit.com/user/daftalchemist/",
    sub: "ftm",
    subUrl: "https://www.reddit.com/r/ftm/",
  },
  {
    title: "Morning time selfie.",
    url: "https://www.reddit.com/r/MtF/comments/5ualce/morning_time_selfie/",
    user: "u/an0npr0xi01",
    userUrl: "https://www.reddit.com/user/an0npr0xi01/",
    sub: "MtF",
    subUrl: "https://www.reddit.com/r/MtF/",
  },
  {
    title:
      "First makeup free selfie, finally seeing results without a pound of makeup!!! 34MTF 1yr HRT",
    url: "https://www.reddit.com/r/MtF/comments/5m39bf/first_makeup_free_selfie_finally_seeing_results/",
    user: "u/brooke360",
    userUrl: "https://www.reddit.com/user/brooke360/",
    sub: "MtF",
    subUrl: "https://www.reddit.com/r/MtF/",
  },
  {
    title:
      "Super dysphoric today. So here’s a selfie of me rn. 7.5 months on T",
    url: "https://www.reddit.com/r/ftm/comments/9i3qdc/super_dysphoric_today_so_heres_a_selfie_of_me_rn/",
    user: "u/TransGayWerewolf",
    userUrl: "https://www.reddit.com/user/TransGayWerewolf/",
    sub: "ftm",
    subUrl: "https://www.reddit.com/r/ftm/",
  },
  {
    title: "[Pre-Everything] I feel good about myself lately. Have a selfie!",
    url: "https://www.reddit.com/r/ftm/comments/84xuys/preeverything_i_feel_good_about_myself_lately/",
    user: "u/Mezduin",
    userUrl: "https://www.reddit.com/user/Mezduin/",
    sub: "ftm",
    subUrl: "https://www.reddit.com/r/ftm/",
  },

  {
    title: "just visited r/detrans. what the fuck?",
    url: "https://www.reddit.com/r/ftm/comments/1dco0n7/just_visited_rdetrans_what_the_fuck/",
    user: "u/[deleted]",
    userUrl: "",
    sub: "ftm",
    subUrl: "https://www.reddit.com/r/ftm/",
  },
  {
    title:
      "I made the mistake to scroll through detrans subs. Now I'm freaking out.",
    url: "https://www.reddit.com/r/MtF/comments/18dlxj5/i_made_the_mistake_to_scroll_through_detrans_subs/",
    user: "u/TvManiac5",
    userUrl: "https://www.reddit.com/user/TvManiac5/",
    sub: "MtF",
    subUrl: "https://www.reddit.com/r/MtF/",
  },
];
*/
export default function RedditEmbeds({ mode }: { mode: "detrans" | "affirm" }) {
  const EMBEDS = mode === "detrans" ? DETRANS_EMBEDS : [];
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || EMBEDS.length === 0) return;

    // Set initial scroll position to offset by 50vw to start from left
    const initialOffset = window.innerWidth * 0.5;
    container.scrollLeft = initialOffset;

    let intervalId: NodeJS.Timeout;
    let isUserInteracting = false;
    let interactionTimeout: NodeJS.Timeout;
    const scrollSpeed = 1; // pixels per interval
    const cardWidth = 320; // approximate width of each card + gap
    const totalWidth = EMBEDS.length * cardWidth;

    const autoScroll = () => {
      if (!isUserInteracting && container) {
        // Use scrollBy for better Safari compatibility
        container.scrollBy({ left: scrollSpeed, behavior: "auto" });

        // Seamless loop: when we've scrolled past the first set, reset to beginning + offset
        if (container.scrollLeft >= totalWidth + initialOffset) {
          container.scrollLeft = initialOffset;
        }
      }
    };

    // Use setInterval instead of requestAnimationFrame for better Safari support
    intervalId = setInterval(autoScroll, 16); // ~60fps

    const pauseAutoScroll = () => {
      isUserInteracting = true;
      clearTimeout(interactionTimeout);
      // Resume auto-scrolling after 1 second of no user interaction
      interactionTimeout = setTimeout(() => {
        isUserInteracting = false;
      }, 300);
    };

    // Listen for wheel events (mouse wheel scrolling)
    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > 0) {
        // Only horizontal scrolling
        //     pauseAutoScroll();
      }
    };

    // Listen for touch events
    const handleTouchStart = () => {
      //     pauseAutoScroll();
    };

    // Listen for mouse drag scrolling
    let isMouseDown = false;
    const handleMouseDown = () => {
      isMouseDown = true;
    };

    const handleMouseMove = () => {
      if (isMouseDown) {
        //   pauseAutoScroll();
      }
    };

    const handleMouseUp = () => {
      isMouseDown = false;
    };

    container.addEventListener("wheel", handleWheel, { passive: true });
    container.addEventListener("touchstart", handleTouchStart, {
      passive: true,
    });
    container.addEventListener("mousedown", handleMouseDown);
    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("mouseup", handleMouseUp); // In case mouse is released outside container

    return () => {
      clearInterval(intervalId);
      clearTimeout(interactionTimeout);
      container.removeEventListener("wheel", handleWheel);
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("mousedown", handleMouseDown);
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [EMBEDS.length]);

  return (
    <>
      {/*
      <Script
        src="https://embed.reddit.com/widgets.js"
        strategy="afterInteractive"
        onLoad={() => {
          // The reddit object is now available on the window
          //   (window as any).reddit?.init?.();
        }}
      />
       */}
      <div
        ref={scrollContainerRef}
        className="scrollbar-hide mt-8 flex cursor-grab items-start gap-4 overflow-x-scroll active:cursor-grabbing"
        style={{
          width: "100vw",
          marginLeft: "calc(-50vw + 50%)",
          paddingLeft: "max(1rem, calc(50vw - 50%))",
          paddingRight: "calc(50vw - 50%)",
        }}
      >
        {/* Duplicate the embeds to create seamless loop */}
        {[...EMBEDS, ...EMBEDS].map((embed, index) => (
          <div key={index} className="flex-shrink-0">
            <RedditEmbed
              title={embed.title}
              url={embed.url}
              user={embed.user}
              userUrl={embed.userUrl}
              imageUrl={embed.imageUrl}
              sub={embed.sub}
              subUrl={embed.subUrl}
            />
          </div>
        ))}
      </div>
    </>
  );
}
