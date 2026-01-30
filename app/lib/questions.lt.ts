/**
 * Lithuanian question categories and featured questions for detrans.ai
 * 
 * Lietuvių kalbos klausimų kategorijos ir teminiai klausimai detrans.ai
 *
 * Gender-Related Terminology Notes / Lyties sąvokų paaiškinimai:
 * - "Sex" (biologinė lytis) = biologinė lytis (anatomija, chromosomos, reprodukcija, nekintamos charakteristikos)
 *   Lietuviškai vartojama: "biologinė lytis", "lytis"
 * - "Gender" (socialinė giminė) = socialinė giminė (vaidmenys, elgesys, savybės, kurias visuomenė laiko tinkamomis
 *   vyrams ir moterims pagal jų biologinę lytį)
 *   Lietuviškai vartojama: "socialinė giminė", "giminė"
 * - "Gender identity" (lyties tapatybė) = vidinis pojūtis būti vyru, moterimi ar kažkur tarp jų
 *   Lietuviškai vartojama: "lyties tapatybė"
 * - "Gender non-conformity (GNC)" (lyties normų nesilaikymas) = kai žmogus elgiasi/pristato save kitaip, nei visuomenė
 *   tikisi pagal jo/jos biologinę lytį
 *   Lietuviškai vartojama: "lyties normų nesilaikymas"
 * - "AFAB/AMAB" (priskirta moterimi/vyru gimus) = priskirta moterimi/vyru gimus (pagal stebėtą biologinę lytį)
 *   Lietuviškai vartojama: "gimusi moterimi", "gimęs vyru"
 * - "Transgender/trans" (translytis) = identifikavimasis su gimine, kuri skiriasi nuo žmogaus biologinės lyties
 *   Lietuviškai vartojama: "translytis", "trans"
 * - "Detransition" (detranzicija) = nustojimas identifikuoti save kaip translytį ir/arba pereinamojo laikotarpio žingsnių atšaukimas
 *   Lietuviškai vartojama: "detranzicija"
 * - "Desist" (pasitraukimas) = kai kas nors, kas identifikavo save kaip translytį (be medicininių intervencijų), nebeidentifikuoja
 *   savęs kaip translyčio
 *   Lietuviškai vartojama: "pasitraukimas" (desistance)
 *
 * Svarbus skirtumas: Lyties disforijos koncepcija remiasi supratimu, kad biologinė lytis ir socialinė giminė yra skirtingos.
 * Lyties normų nesilaikymas (netikimas stereotipams) skiriasi nuo lyties tapatybės, kuri skiriasi nuo žmogaus biologinės lyties.
 */

export const questionCategories = [
  {
    title: "Teminiai klausimai",
    description: "Geriausi klausimai detranzicijų išgyvenusiems žmonėms.",
    questions: [
      "Ką reiškia būti translyčiu?",
      "Ar translyčiai žmonės egzistavo visada?",
      "Ar tiesa, kad tik 1% detranzicionuoja?",
      "Ar brendimo slopintuvai yra grįžtami?",
      "Kokie įrodymai egzistuoja dėl lytį patvirtinančių medicininių protokolų?",
      "Ką reiškia terminas 'kiaušinis' trans bendruomenėse?",
      "Kokios yra 'taip gimęs' naratyvo pasekmės?",
      "Kaip nebinarinės etiketės stiprina tradicinius lyties stereotipus?",
      "Koks skirtumas tarp lyties ir giminės?",
      "Kas yra lyties disforija ir kas ją gali sukelti?",
      "Kodėl kai kurie žmonės nusprendžia detranzicionuoti?",
      "Kaip draugai ar šeima gali paremti norintį keisti lytį žmogų?",
      "Kaip draugai ar šeima gali paremti norintį detranzicionuoti žmogų?",
      "Ar dažna, kad detranzicionieriai gailisi lyties keitimo?",
      "Kodėl kai kurie žmonės nusprendžia vėl keisti lytį po detranzicijos?",
      "Ką detranzicijų istorijos gali manęs išmokyti, net jei mano pereinamasis laikotarpis šiuo metu sekasi gerai?",
      "Kaip žinoti, ar abejonės yra tik nervai, ar ženklas, kad reikia sustoti?",
      "Kodėl translyčių naratyvai apie tai, kodėl žmonės detranzicionuoja, skiriasi nuo tų, kurie iš tikrųjų detranzicionavo?",
      "Ar detranzicionieriai mano, kad pats lyties keitimas yra blogas?",
      "Kokie yra melagingi teiginiai apie translyčius žmones?",
      "Kokie yra melagingi teiginiai apie žmones, kurie detranzicionavo?",
      "Kokius ankstyvus požymius detranzicionieriai norėtų būti pastebėję anksčiau?",
      "Ar giminė yra socialinis konstruktas? Ką tai reiškia?",
      "Kaip feministiniai judėjimai istoriškai vertino giminės sąvoką?",
      "Kaip lyties normų nesilaikymas gali sumažinti spaudimą atitikti lyties vaidmenis?",
      "Kaip detranzicionieriai apibūdina 'gimus neteisingame kūne' pojūtį?",
      "Kas yra lytį patvirtinanti priežiūra ir kokie jos tikslai?",
      "Kodėl lytį patvirtinanti priežiūra paprastai yra vienintelė galimybė daugelyje regionų?",
      "Kaip lyties tyrinėjimo terapija skiriasi nuo lytį patvirtinančios priežiūros?",
      "Kodėl kai kurie žmonės nemėgsta lyties tyrinėjimo terapijos sąvokos, ir kodėl ji uždrausta kai kuriose vietose?",
      "Ar detranzicionieriai mano, kad lytį patvirtinanti priežiūra ir hormonai turėtų būti uždrausti?",
      "Ar detranzicionieriai paprastai gailisi medicininių žingsnių, socialinių žingsnių, ar abiejų?",
      "Kas yra tapatybės spąstai ir kaip žmonės paprastai supranta, kad juose yra?",
      "Kur galima rasti terapeutą, siūlantį atvirą, nedirektyvinę lyties tyrinėjimą? Kokius raudonus vėliavėles reikėtų stebėti?",
      "Ar įvardžių klausinėjimas padeda ar trukdo lyties normų nesilaikantiems žmonėms?",
      "Jei jauna mergina su trumpais plaukais yra nuolatos klausinėjama apie savo įvardžius, kokia yra implikacija ir kaip tai jaustųsi?",
      "Kas yra atšaukimo kultūra ir kokią įtaką ji turi visuomenės sveikatos diskursui?",
      "Ar detranzicionieriai mato lyties keitimą kaip turintį pabaigos tašką ar kaip vykstantį procesą?",
      "Kodėl kai kurios paauglės merginos gali patirti kančią dėl krūtų vystymosi?",
      "Kaip interneto echo kameros gali paveikti tapatybės formavimąsi?",
      "Kodėl detranzicionieriai dažnai praneša, kad jaučiasi, jog jų istorijos ir balsai yra nutildomi tiek translyčių, tiek mainstream erdvėse?",
      "Kokie demografiniai modeliai matomi kreipiantis į lyties klinikas?",
      "Kaip šiuolaikinės queer tapatybės skiriasi nuo ankstesnio LGB judėjimo?",
      "Ką sako dabartiniai tyrimai apie persidengimą tarp autizmo spektro savybių, lyties disforijos ir translyčių tapatybių?",
      "Kodėl lyties disforija nebeklasifikuojama kaip psichikos sutrikimas DSM-5?",
      "Kaip pasikeitė translyčių paplitimas pastaruoju metu ir kas tai gali paaiškinti?",
    ],
  },
  {
    title: "Bendros sąvokos",
    description: "Pagrindinių sąvokų supratimas",
    questions: [
      "Kas yra vyras?",
      "Kas yra moteris?",
      "Kas yra giminė?",
      "Kas yra lyties disforija?",
      "Kas yra translyčio tapatybė?",
      "Kas yra transfobija?",
      "Kas yra atšaukimo kultūra?",
      "Kas yra nebinarinė tapatybė?",
      "Kas yra queer tapatybė?",
      "Kas yra queer teorija?",
      "Kas yra asmenybė?",
      "Kuo asmenybė skiriasi nuo lyties tapatybės?",
      "Kas yra lyties normų nesilaikymas (GNC)?",
      "Kas yra lyties normų laikymasis?",
      "Kas yra detranzicija?",
      "Kas yra pasitraukimas (desistance)?",
      "Kas yra įvardžiai ir kodėl jie svarbūs kai kuriems?",
      "Ką translyčiai žmonės turi omenyje, kai kalba apie 'trans teises'?",
      "Kodėl kai kurie translyčiai sako 'mirtis prieš detranziciją'?",
      "Kokie veiksniai, manoma, sukelia disforiją?",
      "Kas yra 'lyties disforijos biblija'?",
      "Kokios strategijos (medicininės ar ne) padeda žmonėms valdyti disforiją?",
      "Ar interseksualūs žmonės automatiškai yra translyčiai?",
      "Kas yra lyties kintamumas?",
      "Ką reiškia AFAB ir AMAB?",
      "Kas yra TERF?",
      "Kas yra mirusio vardo vartojimas (deadnaming)?",
      "Kas yra neteisingas lytinis adresavimas (misgendering)?",
      "Kas yra cislytis žmogus?",
      "Kas yra biologinė lytis?",
      "Koks skirtumas tarp socialinio ir medicininio pereinamojo laikotarpio?",
    ],
  },
  {
    title: "Medicininė realybė",
    description: "Sveikata, procedūros ir biologinės tiesos",
    questions: [
      "Kokios yra neigiamos moterų testosterono vartojimo pasekmės?",
      "Kokios yra neigiamos vyrų estrogeno vartojimo pasekmės?",
      "Kokius fiziologinius pokyčius testosteronas gali sukelti moterims ir kokie yra apribojimai?",
      "Kokius fiziologinius pokyčius estrogenas gali sukelti vyrams ir kokie yra apribojimai?",
      "Ką apima faloplastika ir kokios yra tipiškos rezultatai?",
      "Ką apima vaginoplastika ir kokios yra tipiškos rezultatai?",
      "Kokios yra skirtingos vaginoplastikos operacijos rūšys?",
      "Kaip kas nors turėtų pasverti tęsimą versus hormonų nutraukimą?",
      "Ar yra matomų skirtumų lyties disforijos diagnozės dažnyje tarp vyrų ir moterų?",
      "Ką smegenų vaizdavimo tyrimai sako apie 'vyriškas' ir 'moteriškas' smegenis?",
      "Kaip lyties disforija skiriasi nuo psichikos ligos diagnostiniuose vadovuose?",
      "Kas yra vaginalinė atrofija ir kas ją sukelia?",
      "Kokios operacijos korekcijos galimybės egzistuoja tiek vaginoplastikai, tiek faloplastikai?",
      "Kaip skirtingos šalys reguliuoja viešą finansavimą lyties operacijoms?",
      "Kokios galimybės egzistuoja krūtinės rekonstrukcijai po mastektomijos?",
      "Kas yra brendimo slopintuvai ir ar jie tikrai tik sustabdo brendimą?",
      "Ar tiesa, kad brendimo slopintuvai yra tie patys vaistai, kurie naudojami lytiniams nusikaltėliams cheminei kastracijai?",
      "Kokie ilgalaikio stebėjimo duomenys egzistuoja dėl kryžminių lyties hormonų vartojimo?",
      "Kas yra WPATH priežiūros standartai ir kaip jie kuriami?",
      "Kas yra Olandų protokolas?",
      "Kas yra staigiai atsiradusi lyties disforija (ROGD) ir kaip ji tiriama?",
      "Kokie yra pranešti apgailestavimo rodikliai įvairioms lyties operacijoms?",
      "Kaip atrodo lyties tyrinėjimo terapija praktikoje?",
    ],
  },
  {
    title: "Visuomenė ir kultūra",
    description: "Kaip lyties įsitikinimai sąveikauja su pasauliu",
    questions: [
      "Kokios yra 'taip gimęs' naratyvo pasekmės?",
      "Ar lyties tapatybės yra perpakuojamos ir stiprinančios seksistinius stereotipus?",
      "Kaip pagrindinis feminizmas keitėsi laikui bėgant, kad prisitaikytų prie translyčių tapatybių?",
      "Kaip įvardžių kultūra gali lemti vaikų permedicininimą?",
      "Kokie yra dokumentuoti rezultatai vaikams, kurie anksti socialiai keičia lytį?",
      "Kokie yra ryšiai tarp BDSM ir translyčių tapatybių?",
      "Kaip giminės sąvoka evoliucionavo istoriškai?",
      "Kaip translyčių aktyvizmas sąveikavo su ankstesniu gėjų teisių aktyvizmu?",
      "Kaip pasikartojantys mantrai ar šūkiai veikia kritinį mąstymą bet kurioje bendruomenėje?",
      "Kaip šiuolaikinis lyties diskursas susikerta su gėjų ir lesbiečių tapatybėmis?",
      "Kas galėtų paaiškinti nebinarinės identifikacijos augimą?",
      "Kokie paaiškinimai egzistuoja dėl padidėjusios savižudybės rizikos translyčių populiacijose?",
      "Kaip suvokta savižudybės rizika veikia viešąjį diskursą apie pereinamąjį laikotarpį?",
      "Ką reiškia 'lyties kritinis' ir kaip tai skiriasi nuo translyčių išskyrimo požiūrių?",
      "Kas yra 'tualeto debatai' ir kokie įrodymai egzistuoja dėl žalos ar saugumo?",
      "Kokie yra pagrindiniai sporto dalyvavimo kontroversijos argumentai?",
      "Kaip mokyklos elgėsi su lyties klausimų turinčiais mokiniais skirtingose jurisdikcijose?",
      "Ką detranzicionieriai mano apie drag queen pasakų pasakojimą?",
      "Ką frazė 'lyties normų neatitinkančių vaikų medicininimas' reiškia kritikams ir advokatams?",
    ],
  },
  {
    title: "Psichologija ir tapatybė",
    description: "Proto ir emocinių aspektų supratimas",
    questions: [
      "Ar kas nors gali būti moteris nebūdamas moteriškas, ar vyras nebūdamas vyriškas?",
      "Kokį vaidmenį socialinė žiniasklaida atlieka žmonėms įsisavinant lyties tapatybes?",
      "Kas yra patvirtinimo neurocheminis ciklas?",
      "Kodėl autistiški žmonės gali būti per atstovaujami lyties klinikose?",
      "Kas yra internalizuotas moterų niekinimas ir kaip jis gali būti susijęs su kūno kančia?",
      "Kas yra internalizuota homofobija?",
      "Kas yra autoginefilija ir kaip ji diskutuojama literatūroje?",
      "Kas yra lyties euforija?",
      "Ar prisitaikanti translyčio tapatybė gali sustiprinti disforiją vietoj jos palengvinimo?",
      "Kodėl išorinis patvirtinimas yra svarbus kai kuriems translyčiams?",
      "Koks skirtumas tarp kūno dismorfinio sutrikimo ir lyties disforijos?",
      "Kokias paraleles gydytojai piešia tarp lyties disforijos ir valgymo sutrikimų?",
      "Kaip traumų istorijos gali sąveikauti su lyties disforija?",
      "Kokios ne medicininės galimybės egzistuoja disforijai valdyti?",
      "Ką reiškia 'praslydimas' (passing) ir kodėl tai gali tapti obsesija kai kuriems žmonėms?",
      "Kaip Jungo anima/animus sąvokos susijusios su lyties tapatybe?",
      "Kas yra šešėlio darbas ir ar jį galima naudoti terapijoje?",
    ],
  },
  {
    title: "Detranzicijos kelionė",
    description: "Gijimas, palaikymas ir kelio atgal radimas",
    questions: [
      "Kaip galiu susitaikyti su negrįžtamais pokyčiais, kuriuos padariau savo kūnui?",
      "Jaučiuosi, kad kai kurie žmonės galvoja, kad aš tiesiog 'grįžau į spintą' ir kad negyvenu autentiškai",
      "Ar tiesa, kad dauguma detranzicionierių galų gale vėl keičia lytį?",
      "Kaip lyties keitimas ir detranzicija gali būti tos pačios gijimo kelionės dalis?",
      "Kur galima rasti terapeutų, turinčių patirties detranzicijos palaikyme?",
      "Ar detranzicija reiškia, kad originalus lyties keitimas buvo nesėkmė?",
      "Ar KBT ar DBT padėjo detranzicionieriams valdyti disforiją?",
      "Kodėl kai kurios trans bendruomenės atgraso nuo detranzicijos naratyvų skaitymo?",
      "Kokios palaikymo grupės egzistuoja specialiai detranzicionieriams?",
      "Kaip kas nors gali vėl 'išeiti' šeimai kaip detranzicionuojantis?",
      "Kokie yra dažni gedulo etapai, pranešti detranzicijos metu?",
      "Kokį vaidmenį psichodeliniai vaistai atliko kai kuriose detranzicijos istorijose?",
    ],
  },
  {
    title: "Akademinis ir tyrimų šališkumas",
    description: "Klausimas institucijų naratyvui",
    questions: [
      "Kokie metodologiniai susirūpinimai buvo iškelti dėl pagrindinių detranzicijos apklausų?",
      "Kodėl tyrėjai praneša apie sunkumus gaunant finansavimą detranzicijos tyrimams?",
      "Ar tyrėjai, kurie šiuo metu identifikuoja save kaip translyčius, turi interesų konfliktą?",
      "Kas buvo Cass apžvalga ir kokias rekomendacijas ji pateikė?",
      "Kas nutiko Lisa Littman 2018 metų ROGD tyrimui?",
      "Kas yra Tavistock klinikos apžvalga ir kodėl ji buvo užsakyta?",
      "Kaip lyties disforija buvo perkategorizuota tarp DSM-IV ir DSM-5?",
    ],
  },
  {
    title: "Kontroversiškos perspektyvos",
    description:
      "Detranzicijos perspektyvos, kurių lyties aktyvistai tikrai nenori, kad girdėtumėte",
    questions: [
      "Kas uždirba pinigus iš lytį patvirtinančios priežiūros?",
      "Kokie struktūriniai veiksniai lemia detranzicijos istorijų nepakankamą atstovavimą mainstream žiniasklaidoje?",
      "Kokiais būdais lyties įsitikinimų sistemos panašios į religijas ar kultus?",
      "Ar mokyklos nukelia tėvus, kai vaikai priima sprendimus apie lyties tapatybę?",
      "Kodėl Tailande tiek daug ladyboy?",
      "Kodėl Iranas yra globalus lyties keitimo operacijų centras?",
    ],
  },
];
