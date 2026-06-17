
import mongoose from "mongoose";
import dotenv from "dotenv";
import connectToDB from "../lib/db.js";
import LibraryBook from "../models/LibraryBook.js";

dotenv.config({ path: ".env.local" });

const rawData = `
അഗ്നിച്ചിറകുകൾ WINGS OF FIRE	BG01	APJ ABDUL KALAM WITH ARUN TIWARI	299	Available	Malayalam	Biography	DC BOOKS 
ഒരു പോലീസ് സർജന്റെ ഓർമക്കുറിപ്പുകൾ	BG02	Dr B UMADATHAN	225	Available	Malayalam	Biography	DC BOOKS
കണ്ണീരിന്റെ കണക്കുപുസ്തകം	BG03	THAHA MADAYI	60	Available	Malayalam	Biography	MATHRUBHUMI BOOKS 
എഴുത്തിന്റെ വെയിലും നിലാവും	BG04	ASHOKAN CHERUVIL	90	Available	Malayalam	Biography	DC BOOKS
മഷിചരിഞ്ഞ ആകാശം	BG05	SHANAVAS PONGANAD	110	Available	Malayalam	Biography	MELINDA BOOKS 
ബുക്കർ ടി. വാഷിംഗ്ടണിന്റെ ആത്മകഥ	BG06	AMIR SHAFIN	280	Available	Malayalam	Biography	AJANTHA BOOKS 
പ്രബോധനം അനുഭവങ്ങളും പാഠങ്ങളും	BG07	M.A JAMEEL AHMED, ABDULLA ADIYAR	25	Available	Malayalam	Biography	ISLAMIC PUBLISHING HOUE
എന്റെ ഇസ്ലാം അനുഭവങ്ങൾ	BG08	E.C SIMON MASTER	50	Available	Malayalam	Biography	ISLAMIC PUBLISHING HOUE
സ്കൂൾ മുറ്റം	BG09	GIREESH KAKKUR	130	Available	Malayalam	Biography	OLIVE PUBLICATIONS
കഫ്ക്കയുടെ പ്രണയ ലേഖനങ്ങൾ	BG10	K A ANTONY	75	Available	Malayalam	Biography	OLIVE PUBLICATIONS
കള്ളൻ	BG11	RAHMAN KIDANGAYAM	190	Available	Malayalam	Biography	OLIVE PUBLICATIONS
അനുഭവം ഓർമ യാത്ര	BG12	V R SUDHEESH	130	Available	Malayalam	Biography	OLIVE PUBLICATIONS
അനുഭവം ഓർമ യാത്ര	BG13	P SURENDRAN	110	Available	Malayalam	Biography	OLIVE PUBLICATIONS
ഉബൈദ് സ്മാരക ഗ്രന്ഥം	BG14	KM AHMED	50	Available	Malayalam	Biography	KASARGOD SAHITHYAVEDI
ആത്മവിശ്വാസം വലിയ മരുന്ന്	BG15	PUNATHIL KUNHABDULLA	100	Available	Malayalam	Biography	MATHRUBHUMI BOOKS 
ബഷീർ ഉസ്താദും ഞാനും	BG16	V ABDULLA	70	Available	Malayalam	Biography	MATHRUBHUMI BOOKS 
ജീവിതകാഴ്ചകൾ	BG17	DR VP GANGADHARAN	90	Available	Malayalam	Biography	MATHRUBHUMI BOOKS 
ഞാൻ ഇന്നസെന്റ്	BG18	INNOCENT	140	Available	Malayalam	Biography	OLIVE PUBLICATIONS
ആൺ മഴയോർമകൾ	BG19	T.K HARIS	260	Available	Malayalam	Biography	OLIVE PUBLICATIONS
സുൽത്താൻ വാриയംകുന്നൻ	BG20	RAMEES MOHAMED O	645	Available	Malayalam	Biography	TWO HORN
കാണാപ്പുറം ഒരു പത്രഫോട്ടോഗ്രാഫിയുടെ അനുഭവക്കുറിപ്പ്	BG21	JOSEKUTTY PANAYKKAL	80	Available	Malayalam	Biography	DC BOOKS
നിഴൽവീണ രാത്രികൾ	BG22	BASARAT PEER	160	Available	Malayalam	Biography	DC BOOKS 
വിപരീതം	BG23	RAJU	60	Available	Malayalam	Biography	DC BOOKS 
ഈശോമിശിഹായ്ക്ക് സ്തുതിയായിരിക്കട്ടെ	BG24	KP JOSEPH	110	Available	Malayalam	Biography	DC BOOKS
ദൈവദശകം	BG25	NAMBODIRIPADU	50	Available	Malayalam	Biography	MINI ANTONY IAS
എന്റെ ജീവിതത്തിലെ ചിലർ	BG26	KR MEERA	320	Available	Malayalam	Biography	DC BOOKS 
മലയാളിയുടെ മാർകോസ്	BG27	Dr DEEPESH KARIMPUNKARA	200	Available	Malayalam	Biography	SAMAYAM PUUBLICATION
സിറാജുന്നിസ	BG28	TD RAMAKRISHNAN	80	Available	Malayalam	Biography	DC BOOKS 
ജി. പി. പിള്ള മഹാത്മാഗാന്ധിക്ക് മാർഗദർശിയായ മലയാളി	BG29	MALAYANKIZY GOPALAKRISHNAN	125	Available	Malayalam	Biography	KERALA SARKAR
കൊഴിഞ്ഞുപോയ ഇതളുകൾ	BG30	MUJAMMAH	100	Available	Malayalam	Biography	AL MUJAMMAH
നഫീസത്തുൽ മിസ് രിയ്യ	BG31	K. K ABDUL RAHMAN MUSLIYAR, ALUVA	10	Available	Malayalam	Biography	TIRURANGABI BOOK STALL
നൂറുൽ ഉലമ എം എ അബ്ദുൽ ഖാദിർ മുസ്ലിയാർ	BG32	M.A ABDULQADIR MUSLIYAR	300	Available	Malayalam	Biography	IPB
യൂസുഫ് നബി (അ) ചരിത്രം	BG33	MUTHUKOYA THANGAL	10	Available	Malayalam	Biography	ISLAMIC PUBLISHING HOUE
വിമർശനങ്ങൾ അതിജയിച്ച കാന്തപുരം	BG35	ABOO MIDLAJ	70	Available	Malayalam	Biography	FORES PUBLICATIONS
ഗൗസുൽ അഅ്ളം	BG36	O ABU SAHIB	60	Available	Malayalam	Biography	CRESCENT PUBLISHING HOUSE 
ഖിള്ർ നബി (അ)	BG38	ABDUL HAKIM SA ADI	170	Available	Malayalam	Biography	ISLAMIC PU
കൂടിക്കഴ് ചക്കൾ	BG39	Dr. V. P AHMED KUTTY TORANDO	120	Available	Malayalam	Biography	ISLAMIC PUBLISHING HOUE
മാലിക് ബ്നു ദീനാറും കാസർകോട്ടെ പുരാതന പള്ളിയും	BG40	ANAS HUDAVI	60	Available	Malayalam	Biography	ISLAMIC PUBLISHING HOUE
ഫാത്വിമ (റ) അഹലുബൈത്തിന്റെ ഉമ്മ	BG41	KODUVALLY ABDUL KHADIR	40	Available	Malayalam	Biography	SHARAFEE PUBLICATION 
കാലത്തിന്റെ ഗുരു അലംപ്പാടി ഉസ്താദ്	BG42	ABUBAKAR SA ADI	80	Available	Malayalam	Biography	ISLAMIC PUBLISHING HOUE
ഉമ്മഹാതുൽ മുഅ്മിനീൻ ബീവി ഖദീജ (റ)	BG43	SAYYID SWALAAHUDDEEN BUKHARI	110	Available	Malayalam	Biography	READ PRESS 
ഇമാം ബുഖാരി (റ)	BG44	A.P USTHAD	75	Available	Malayalam	Biography	ISLAMIC PUBLISHING HOUE
33 പേർ 69 ദിവസങ്ങൾ 2257അടി ഭൂഗർഭത്തിൽ	BG45	JONOTHAN FRANKLIN	150	Available	Malayalam	Biography	DC BOOK 
സ്വർഗംതേടി	BG46	ZIAUDDIN SARDAR	330	Available	Malayalam	Biography	OTHER BOOKS
ഇബ്നു മാജിദ്	BG47	SULTAN BIN MUHAMMAD AL QASIMI	200	Available	Malayalam	Biography	OTHER BOOKS
ഹെർമൺ ഗുണ്ടർട്ട്	BG48	K. BALAKRISHNAN	70	Available	Malayalam	Biography	ISLAMIC PUBLISHING HOUE
ആത്മകഥ മാക്സ് മുള്ളർ	BG49	MAX MULLER	110	Available	Malayalam	Biography	MATHRUBHUMI BOOKS 
ഖിലാഫത്ത് സ്മരണകൾ	BG50	MOZHIKUNNATHU BRAHMADATHAN NAMBOODIRIPPAD	135	Available	Malayalam	Biography	MATHRUBHUMI BOOKS
THE LIFE OF MUHAMMED	BG51	MUHAMMED HUSEIN HAYKAL	685	Available	Malayalam	Biography	ISLAMIC BOOK TRUST
ആത്മകഥ സുഭാഷ്ചന്ദ്ര ബോസ്	BG52	SUBHAS CHANDRA BOSE	170	Available	Malayalam	Biography	MATHRUBHUMI BOOKS 
ഇത് അഗസ്റ്റിൻ മോണിക്കയുടെ മകൻ	BG53	THYSSERY	160	Available	Malayalam	Biography	DC BOOKS 
മുഹമ്മദ്	BG54	ABOOBAKER SIRAJUDEEN	390	Available	Malayalam	Biography	OTHER BOOKS 
ശൈഖ് മുതവല്ലി ശഅ്റാവി	BG55	O.M SAYYID ADIL HASSAN WAFY	130	Available	Malayalam	Biography	BOOK PLUS 
ടിപ്പു സുൽത്താൻ	BG56	T.K BALAKRISHNAN	35	Available	Malayalam	Biography	BOOK PLUS
പ്രവാചകനാവാൻ മോഹിച്ച കവി	BG57	K.V.M PANDHAVOOR	30	Available	Malayalam	Biography	AL HUDE BOOK STALL CALICUT
ഖാലിദുബ്നുൽ വലീദ്	BG58	O.ABDULLA	60	Available	Malayalam	Biography	ISLAMIC PUBLISHING HOUSE
ഇബ്നുസിന	BG59	M.S NAIR	30	Available	Malayalam	Biography	ISLAMIC PUBLISHING HOUSE
ഇമാം അബുഹനീഫ (റ)	BG60	ABDURAHMAN MANGADU	30	Available	Malayalam	Biography	IPB
നെല്ലിക്കുത്ത് ഇസ്മാഈൽ മുസ്ലിയാർ	BG61	ISLAMIC PUBLICATION BUREAU	75	Available	Malayalam	Biography	IPB
ഇമാം മാലിക് (റ)	BG62	ABDURAHMAN MANGAD	30	Available	Malayalam	Biography	IPB
മമ്പുറം തങ്ങൾ	BG63	NIZAMUDDIN	30	Available	Malayalam	Biography	DC BOOKS
റസൂലിന്റെ കൂട്ടുകാരൻ	BG64	JAMAL MUHAMMED	60	Available	Malayalam	Biography	IPB
ഇമാം അഹ്മദ്ബ്നു ഹമ്പൽ (റ)	BG65	ABDURAHMAN MANGAD	30	Available	Malayalam	Biography	IPB
ഇമാം ശാദുലി (റ)	BG66	SHAMEER MAHLARI NEDIYANAD	100	Available	Malayalam	Biography	POOMKAVANAM PUBLICATIONS 
നൂറ്റാണ്ടിനെ മാറ്റിവെച്ച 101 ഇന്ത്യക്കാർ	BG67	N MOOSAKUTTY	100	Available	Malayalam	Biography	H&C PUBLISHING HOUSE
തിരുരങ്ങാടി ബാപ്പു മുസ്ലിയാർ	BG68	ISLAMIC PUBLICATION BUREAU	60	Available	Malayalam	Biography	IPB
ജീവിതത്തിൽ നിന്ന്	BG69	DOCTOR N A MUHAMMED	80	Available	Malayalam	Biography	KAIRALI BOOKS
ഉമ്മഹാത്തുൽമുഅമിനീൻ പ്രവാചകപത്നിമാർ	BG70	MOHAMMED BUKHARI MA	100	Available	Malayalam	Biography	OTHER BOOKS
അണ്ണ ഹസാരെ	BG71	N. SREEKUMAR	100	Available	Malayalam	Biography	MATHRUBHUMI BOOKS
ഉമ്മുന്നബി	BG72	P.M.K FAIZEE	50	Available	Malayalam	Biography	POOMKAVANAM PUBLICATIONS 
ജിന്ന വ്യക്തിയും രാഷ്ട്രീയവും	BG73	A. K ABDUL MAJEED	150	Available	Malayalam	Biography	OTHER BOOKS
ടൈഗ്രീസിന്റെ പുത്രി	BG74	HUSSAIN RENDATHANI	50	Available	Malayalam	Biography	OTHER BOOKS
കാറൽ മാർകസും അദ്ദേഹത്തിന്റെ സിദ്ധാന്തവും	BG75	V I LENIN	50	Available	Malayalam	Biography	PRABHATHAM BOOKS
സമസ്തയെ സംпуഷ്ടമാക്കിയ സമുന്നതന്മാർ	BG76	KM MOHAMMAD KOYA	50	Available	Malayalam	Biography	M. S. M. P. B.  CHALIYAM
മഹചരിതമാല	BG77	PERUNNA K. N NAIR	50	Available	Malayalam	Biography	KAIRALI CHILDREN'S BOOKS TRUST
പതി അബ്ദുൽ ഖാദിർ മുസ്ലിയാർ ജീവിതവും ദർശനവും	BG78	A.P.M. FAROOQUE KOLLAM	50	Available	Malayalam	Biography	SIDDEEQ PUBLICATIONS
കാലത്തിന്റെ കർമസാക്ഷി	BG79	SUNNI MARCUS KOZHIKODE	100	Available	Malayalam	Biography	IHYA USSUNNA SUNNI MARKAZ
വഴിവിളക്കുകൾ	BG80	YOOSUF FAIZEE KANCHIRAPPUZA	150	Available	Malayalam	Biography	POOMKAVANAM PUBLICATIONS 
101 സ്വഹാബി വനിതകൾ	BG81	MUJEEBURAHMAN KAKKAD	150	Available	Malayalam	Biography	POOMKAVANAM PUBLICATIONS 
ടിപ്പു സുൽത്താൻ	BG82	HS SHIVA PRAKASH.	70	Available	Malayalam	Biography	MATHRUBHUMI BOOKS
മരുദ്ദ്രമായിലെ സൂര്യോദയം	BG83	A.K ABDUL MAJEED	75	Available	Malayalam	Biography	IPB
ഇമാം ഷാഫിഈ (റ)	BG84	ABDURAHMAN MANGAD	100	Available	Malayalam	Biography	IPB
ഉമർ ഖാസി (റ)	BG85	K.ABOOBAKAR	100	Available 	Malayalam	Biography	IPB
ഖസ്വസുൽ അമ്പിയാഅ്	BG86	ABDUL HAKEEM SA-ADI KARAKKUNNU	200	Available	Malayalam	Biography	CRESCENT PUBLISHING HOUSE 
മിസ്വറിലെ റാണി	BG88	LAYYINA WAFIYYA AMBALAKKADAVU	80	Available	Malayalam	Biography	BOOK PLUS PUBLISHERS
മുഹമ്മദ് മുസ്ത്വഫാ (സ)	BG89	P.M.K FAIZEE	150	Available	Malayalam	Biography	BOOK TRUST OF INDIA 
ഓക്സിജൻ ഒരു ഡോക്ടറുടെ ഓർമ്മക്കുറിപ്പുകൾ	BG90	Dr KAFEEL KHAN	450	Available	Malayalam	Biography	MADHYAAMAM BOOKS
ഇമാം അഹ്മദ്ബ്നു ഹമ്പൽ (റ)	BG91	ABDURAHMAN MANGADU	60	Available	Malayalam	Biography	IPB
കറാമാത്തുകൾ ഒരോഴുക്കെന്നപോലെ	BG92	SAYYID YOOSUFUL BUKHARI VAILATHUR	100	Available	Malayalam	Biography	MDS BOOKS
നിസാമുദ്ധീൻ ഔലിയ നിലാവെളിച്ചം	BG93	JAMAL MUHAMMED	70	Available	Malayalam	Biography	IPB
ചെങ്കോൽ	BG94	MEHAMMED PARANNOOR	100	Available	Malayalam	Biography	IPB
ജനസേവകൻ	BG95	JAMAL MOHAMMED	50	Available	Malayalam	Biography	IPB
റസൂലിന്റെ കൂട്ടുകാരൻ	BG96	JAMAL MOHAMMED	50	Available	Malayalam	Biography	IPB
ജയഭേരി	BG97	JAMAL MUHAMMAD	50	Available	Malayalam	Biography	IPB
ഭരണസാരധ്യം	BG98	JAMAL MOHAMMED	50	Available	Malayalam	Biography	IPB
തണൽ	BG99	JAMAL MOHAMMED.	50	Available	Malayalam	Biography	IPB
ഇമാം ഷാഫി ഈ (റ) ജ്ഞാന യാത്രകൾ	BG100	Dr UMARUL FAROOQ	200	Available	Malayalam	Biography	BOOK PLUS
ഹസ്രത്ത് അലി (റ) അറിവിന്റെ കവാടം	BG101	POKKER KADALUNDI	50	Available	Malayalam	Biography	IPB
ഇമാം ഷാഫി ഈ (റ) ജ്ഞാന യാത്രകൾ	BG102	Dr UMARUL FAROOQUE SAQUAFI	200	Available	Malayalam	Biography	IPB
കടന്നുവരവ്	BG103	MUHAMMED PARANNOOR	60	Available	Malayalam	Biography	IPB
മഖ്ദും കുടുംബം	BG104	SHAHEED	60	Available	Malayalam	Biography	IPB
ഒരു വ്യാജവൈദ്യന്റെവിചിത്രനുഭവങ്ങൾ	BG105	Dr SHAFI ABDULLAH ZUHOORI	400	Available	Malayalam	Biography	OLIVE PUBLICATIONS
ഇസ്ലാമിലേക്കുള്ള പാത	BG106	K. T HUSSAIN	220	Available	Malayalam	Biography	ISLAMIC PUBLISHING HOUSE
വെള്ളില സ്മരണകൾ	BG107	ISLAMIC PUBLICATION BUREAU	120	Available	Malayalam	Biography	IPB
വെളിയംകോട് ഹസ്രത്ത് ഉമർഖാസി (റ) യുടെ ജീവചരിത്രവും കൃതികളും	BG108	VELIYANKODE MAHALLU JAMA_ATH COMEETTEE	350	Available	Malayalam	Biography	VELIYANKODE MAHALLU JUMA-ATH COMMITTEE VELIYANKODE
നെല്ലിക്കുത്ത് ഇസ്മാഈൽ MUSLIYAR	BG109	PUBLIC ISLAMIC BUREAU	75	Available	Malayalam	Biography	OLIVE PUBLICATIONS
ചിത്രയാത്രകൾ	BG110	Dr NP VIJAYKRISHNAN	80	Available	Malayalam	Biography	MATHRUBHUMI BOOKS
മഹാത്മാ ഗാന്ധി	BG111	ROMAIN ROLLAND	170	Available	Malayalam	Biography	MATHRUBHUMI BOOKS
നഷ്ട ജാതകം	BG112	PUNATHIL KUNHABDULLA	175	Available	Malayalam	Biography	DC BOOKS
ഖുതുബുൽ അഖ്താബ് ശൈഖ് ജീലാനി (ഖ. സി.)	BG113	SAIDALAVI SAQUAFI KODUR	200	Available	Malayalam	Biography	INFO BOOKS
കസൻദ് സാക്കിസ്	BG115	NOUSHAD	200	Available	Malayalam	Biography	PAPPLYON
സൗണ്ട് ഓഫ് മ്യൂസിക്	BG116	MARIA ROSE	150	Available	Malayalam	Biography	OLIVE PUBLICATIONS
നക്ഷത്രങ്ങളുടെ സ്നേഹഭാജനം	BG117	M.K SANU	125	Available	Malayalam	Biography	DC BOOKS 
സിഗ് മണ്ട് ഫ്രോയ്ഡ് ജീവിത ദർശനം സംഭാഷണം	BG118	RAKESH NATH	280	Available	Malayalam	Biography	OLIVE PUBLICATIONS
വരപ്രസാദം	BG119	SUBHASHCHANDRAN	150	Available	Malayalam	Biography	OLIVE PUBLICATIONS
കുടിയന്റെ കുമ്പസാരം	BG120	JOHNSON	550	Available	Malayalam	Biography	DC BOOKS 
ആംഗല സാഹിത്യ നായകൻ	BG121	KM CHANDRA SHARMA	500	Available	Malayalam	Biography	DC BOOKS 
കവിയുടെ കാൽപ്പാടുകൾ	BG122	P.KUNJIRAMAN NAIR	750	Available	Malayalam	Biography	DC BOOKS
നൂറ്റാണ്ടിന്റെ പ്രകാശം നൂറുൽ ഉലമ	BG123	P. ABDUL HAKEEM SA ADI	400	Available	Malayalam	Biography	ICF MUSAFFA ABUDABI
സുൽത്താനുൽ ആരിഫീൻ ശൈഖ് റിഫാഈ	BG124	SAIDALAVI SAQAFI	160	Available	Malayalam	Biography	ISLAMIC PUBLISHING HOUE
101 സ്വഹാബി വനിതകൾ	BG125	MUJIBURAHMAN KAKKAD	150	Available	Malayalam	Biography	POOMKAVANAM PUBLICATIONS 
ഖുറാസായുടെ നായകൻ	BG126	SABIR MOHAMMED	100	Available	Malayalam	Biography	OLIVE PUBLICATIONS
ശിറാസിലെ പൂങ്കുയിൽ	BG127	POCKER KADALUNDI	80	Available	Malayalam	Biography	POOMKAVANAM PUBLICATIONS 
രബീന്ദ്രനാഥ ടാഗോർ കുട്ടികാലം	BG128	RABINBRANATHA TAGORE	85	Available	Malayalam	Biography	MATHRUBHUMI BOOKS
സുഭാഷ് ചന്ദ്രൻ	BG129	SUBHASH CHANDRAN	150	Available	Malayalam	Biography	MATHRUBHUMI BOOKS
മരുപ്പച്ച	BG131	ABU RAFIQ MADANI	70	Available	Malayalam	Biography	IPB
മാൽക്കം എക്സ്	BG132	ALEX HALEY	130	Available	Malayalam	Biography	ISLAMIC PUBLISHING HOUSE
ബദിഉസ്സമാൻ സഈദ് നുഴ്സി	BG133	SAEED RAMADAN BOOTHI	130	Available	Malayalam	Biography	ISLAMIC PUBLISHING HOUSE
ചരിത്രത്തിന്റെ താരാപഥങ്ങളിൽ	BG134	P K JAMAL	100	Available	Malayalam	Biography	ISLAMIC PUBLISHING HOUSE
മുഹമ്മദ് മുസ്ത്വഫ	BG135	PMK FAIZY	300	Available	Malayalam	Biography	POOMKAVANAM PUBLICATIONS 
മുഹമ്മദ് നബി (സ്വ) ഉദയവും ഉയർച്ചയിൽ	BG136	Dr MOHAMMED FAROOKH BUKHARI	70	Available	Malayalam	Biography	ISLAMIC PUBLISHING HOUE
പോരാട്ടവും കീഴടങ്ങളും	BG137	JEFFREY LANG	300	Available	Malayalam	Biography	ISLAMIC PUBLISHING HOUSE
കമലസുരയ്യാ സഫലമായ സ്നേഹാന്വേഷണം	BG138	SHEIKH MOHAMMED	100	Available	Malayalam	Biography	OLIVE PUBLICATIONS
ഉമ്മഹാത്തുൽ മുഅമിനീൻ	BG139	MOHAMMED BUKHARI M. A	170	Available	Malayalam	Biography	IHSAN PUBLICATIONS 
പേര് ഫാഇസ്	BG140	SABI PUBLICATION	150	Available	Malayalam	Biography	SABIC PUBLICATIONS
മുഹമ്മദ് (സ്വ) മാതൃക വൃക്തിത്വ	BG141	MUHAMMAD FAROOQ NAEEMI AL BUKHARI	130	Available	Malayalam	Biography	TAYBA PUBLICATIONS
ലുഖ്മാനുൽ ഹകീം (റ)	BG142	MUTHUKOYA THANGAL	100	Available	Malayalam	Biography	NOORUL ISLAM PRESS & BOOK STALL
താജുൽ ഉലമ	BG143	THAJUL ULAMA	400	Available 	Malayalam	Biography	READ PREES
സി. എച്ചിന്റെ മൊഴിമുത്തുകൾ	BG145	N.K HAFSAL RAHMAN	200	Available	Malayalam	Biography	READ PRESS
താജുശ്ശരീഅ ശിറിയ അലികുഞ്ഞി മുസ്ലിയാർ	BG147	READ PLUS	400	Available 	Malayalam	Biography	 READ PRESS
നൂറ്റാണ്ടിന്റെ പ്രകാശം നൂറുൽ ഉലമ	BG149	ABDUL HAKIM SAADI KARAKUNN	400	Available	Malayalam	Biography	ICF MUSAFFA
കൻസുൽ ഉലമ	BG150	READ PLUS	400	Available	Malayalam	Biography	READ PRESS
തിരുരങ്ങാടി ബാപ്പു മുസ്ലിയാർ	BG151	ISLAMIC PUBLIC BUREA	200	Available	Malayalam	Biography	IPB
ശൈഖ് AHMED ദൗഗാൻ	BG152	DR MUHAMMAD FAROOQ NAEMI	220	Available	Malayalam	Biography	IPB
ശുജായി മൊയ്ദുമുസ്ലിയാർ	BG153	DR ZAKIR HUSSAIN	250	Available	Malayalam	Biography	IPB
നെൽസൺ മണ്ടേല ജീവിതകഥ	BG154	K RADHAKRISHNAN	250	Available	Malayalam	Biography	MATHRUBHUMI BOOKS
ഞാൻ മലാല	BG155	PS RAKESH	300	Available	Malayalam	Biography	DC BOOKS
ആരോടും ചൊല്ലാതെ	BG156	TOPIL. MOHAMMED BIRAN	200	Available	Malayalam	Biography	DC BOOKS
എന്റെ സത്യന്വേഷണ പരീക്ഷണകഥ	BG157	M K GANDHI	200	Available	Malayalam	Biography	NAVAJIVAN
വിരലറ്റം	BG158	MOHAMMAD ALI SHIHAB	400	Available	Malayalam	Biography	DC BOOKS 
ഇബ്സന്റെ ലോകം	BG159	P J THOMAS	150	Available	Malayalam	Biography	DC BOOKS
ഡോ. ബി. ആർ. അംബേദ്കർ ജീവിതവും ദർശനവും	BG160	T K C VASUTALA	500	Available	Malayalam	Biography	PRANATHA BOOKS
ഓർമകളിലെ ഓ. ഖാലിദ്	BG161	ASHRAF MANNA.	300	Available	Malayalam	Biography	IPB
ജാക്ക് മാ	BG162	PV ALBIN	200	Available	Malayalam	Biography	IPB
നിസാമുദീൻ ഔലിയ നിലാവെളിച്ചം	BG163	JAMAL MOHAMMED CASH	100	Available	Malayalam	Biography	IPB
സ്നേഹനിലാവ് നഫീസതുൽ മിസിരിയ്യ (റ)	BG164	SUFIYAN TOTTPOYIL	100	Available	Malayalam	Biography	IPB
ലോഞ്ച ഒരു ജീവിതപ്പോരാട്ടത്തിന്റെ കഥ	BG165	MV SETHU MADHAVAN	750	Available	Malayalam	Biography	MATHRUBHUMI BOOKS
ബസ്വറയിലെ ദിവ്യനക്ഷത്രം	BG166	KHULLAMBARA SHAMSUDDIN	100	Available	Malayalam	Biography	IPB
ഖലീഫ ഉമറുബ്ൻ അബ്ദുൽ അസിസ്	BG167	SYED SALAHUDDIN BUKHARI	200	Available	Malayalam	Biography	IPB
ഖിലഫത്ത് സ്മരണകൾ	BG168	BRAHMARADATHAN NAMBODIRIPADU	450	Available	Malayalam	Biography	MATHRUBHUMI BOOKS
ഉമറുൽ ഫാറൂഖ് (റ)	BG170	SAIFUDDIN VAFI	100	Available	Malayalam	Biography	BOOKS PULS
അബുബകർ സിദ്ദീഖ് (റ)	BG171	VALIORA VP	100	Available	Malayalam	Biography	BOOKS PULS
ഉസ്മാൻ ബ്നു അഫ്ഫാൻ (റ)	BG172	SHAFIQ VAFI	100	Available	Malayalam	Biography	BOOKS PLUS
അംറ് ബ്നുൽ ആസ് (റ)	BG173	MOHAMMED TH	200	Available	Malayalam	Biography	BOOKS PLUS
ത്വൽഹത് ബ്നു ഉബൈദില്ല(റ)	BG174	FEROZ KHAN	100	Available	Malayalam	Biography	BOOKS PLUS
അബ്ദുറഹ്മാൻ ബ്നു ഔഫ് (റ)	BG175	MURSHID HUDAVI	100	Available	Malayalam	Biography	BOOKS PLUS
അബുഉബൈദ(റ)	BG176	MOHAMMED HUDAVI	100	Available	Malayalam	Biography	BOOKS PLUS
സഈദ് ബ്നു സൈദ് (റ)À	BG177	ALI HASSAN HUDAVI	100	Available	Malayalam	Biography	BOOKS PLUS
സുബൈർ ബ്നുൽ അവാം (റ)	BG178	SOLIM HUDAVI	100	Available	Malayalam	Biography	READ PRESS
യൂനുസ് NABI(അ)	BG179	KMS PRASIDDIGARANAM	50	Available	Malayalam	Biography	K.M.S
അഹലുസ്സുന്ന ഒരു ദർശനിക പഠനം	BG180	AP ABUBAKAR MUSLIYAR KANTHAPURAM	200	Available	Malayalam	Biography	READ BOOKS 
സൗദയുടെ സൗഭാഗ്യം	BG181	KVK BUKHARI	50	Available	Malayalam	Biography	MAS CREATION
നെൽസൺ മണ്ടേല ജീവിതകഥ	BG182	K RADHAKRISHNAN	250	Available	Malayalam	Biography	MATHRUBHUMI BOOKS
മുസ്ലിം ചരിത്രകാരന്മാരും ചരിത്ര ഗ്രന്ഥങ്ങളും	BG183	ADIL SUBHAN	150	Available	Malayalam	Biography	READ PRESS
ഖുതുബുസ്സമാൻ മമ്പുറം സയ്യിദ് അലവി തങ്ങൾ (ഖ. സ)	BG184	KE MOHAMMED KUTTY	50	Available	Malayalam	Biography	NOORUL ISLAM PRESS & BOOK STALL 
സ്വലാഹുദ്ദീൻ അയ്യൂബി	BG185	CVM HANIFA FAIZI	100	Available	Malayalam	Biography	ISLAMIC PUBLISHING HOUE
ഓർമകളിലെ ഓ ഖാലിദ്	BG186	SSF KANNUR JILLA	200	Available	Malayalam	Biography	P.P BOOKS 
പേര് ഫായിസ് വയസ്സ് പത്തൊമ്പത് ദേശം കൊളപ്പുറം	BG187	SABIT PUBLICATION	250	Available	Malayalam	Biography	SABIC PUBLICATIONS
പേര് ഫായിസ് വയസ്സ് പത്തൊമ്പത് ദേശം കൊളപ്പുറം	BG188	SABIT PUBLICATION	200	Available	Malayalam	Biography	SABIC PUBLICATIONS
മുഹമ്മദ് നബി (സ്വ) ചരിത്രസ്മരണകൾ	BG189	MP ABDULLAH FAIZI	700	Available	Malayalam	Biography	IPB
ഹസനുൽ ബസ്വരി(റ) ജീവിതവും ദർശനവും	BG191	ABDUS SALAM AMANI	100	Available	Malayalam	Biography	HASANUL BASARI PUBLICATION 
ഹസ്രത്ത് റാഫിഅ ബ്നു ഹബീബ് മാലിക്ദീനാർ(റ)	BG192	SARAH FULL HAMID	100	Available	Malayalam	Biography	ICHLANGOD JAMA-ATH COMMITTEE 
അസയ്യിദ് മുല്ലക്കോയ തങ്ങൾ	BG193	HASHIM AHSANI	100	Available	Malayalam	Biography	ISLAMIC PUBLISHING HOUE
നൂറ്റാണ്ടിന്റെ പ്രകാശം നൂറുൽ ഉലമ	BG195	ABDUL HAKEEM SAADI	400	Available	Malayalam	Biography	ISLAMIC PUBLISHING HOUE
നൂറ്റാണ്ടിന്റെ പ്രകാശം നൂറുൽ ഉലമ	BG196	ABDUL HAKEEM SAADI	400	Available	Malayalam	Biography	ICF MUSAFFA
ഇമാം മാലിക് (റ)	BG197	ABDUL RAHMAN	100	Available	Malayalam	Biography	IPB
പേര് ഫായിസ് വയസ്സ് പത്തൊമ്പത് ദേശം കൊളപ്പുറം	BG198	SABIT PUBLICATION	300	Available	Malayalam	Biography	SABIC PUBLICATIONS
സൈനബുൽ ഗസ്സാലി ജയിലനുഭവങ്ങൾ	BG199	VS SALIM	250	Available	Malayalam	Biography	OLIVE PUBLICATIONS
ഓർമകളിലെ ഒ.ഖാലിദ്	BG200	ASHRAF MANNA	300	Available	Malayalam	Biography	IPB
ഓർമകളിലെ ഒ.ഖാലിദ്	BG201	ASHRAF MANNA	300	Available	Malayalam	Biography	IPB
നൂറ്റാണ്ടിന്റെ പ്രകാശം നൂറുൽ ഉലമ	BG202	ABDUL HAKIM SAIDI	400	Available	Malayalam	Biography	ICF MUSAFFA
ഖിള്ർ (അ)	BG203	ABDUL HAKIM SAIDI	200	Available	Malayalam	Biography	OLIVE PUBLICATIONS
ശൈഖ് അഹ്മദ് സിർഹിദ്	BG204	HUSSAIN RENDATHANI	200	Available	Malayalam	Biography	OLIVE PUBLICATIONS
എന്റെ സത്യാനേഷണ പരീക്ഷണകഥ	BG205	GANDHIJI	300	Available	Malayalam	Biography	NAVAJIVAN PUBLISHING HOUSE
തിരുനബിയും വിശുദ്ധ കുടുംബവും	BG206	ABDUL GAFUR AHSANI	100	Available	Malayalam	Biography	OLIVE PUBLICATIONS
എൻ. NM. അബ്ദുറഹ്മാൻ മുസ്ലിയാർ ചെമ്പരിക്ക	BG207	NKM MALHARI	500	Available	Malayalam	Biography	MAJLISU DAHVATHIL ISLAMIYYA
മുഹമ്മദ് നബി (സ്വാ) ആആധുനികതയുടെ വൈദ്യമുദ്ര	BG208	DR SHAFI ABDULLAH	100	Available	Malayalam	Biography	I.I.M.S
ശൈഖ് അഹ്മദ് സിർഹിദ്	BG209	HUSSAIN RENDATHANI	200	Available	Malayalam	Biography	IPB
പാസ്പോർട്ട് ഓഫ് പ്രൊഫേറ്റ് മുഹമ്മദ് (S)	BG210	SYED IBRAHIM AL MASHOOR	100	Available	Malayalam	Biography	MADEENA PUBLICATION 
മുഹമ്മദ് നബി (സ്വാ)	BG211	HANDBOOKS	500	Available	Malayalam	Biography	TAYBA PUBLICATION
നൂറ്റാണ്ടിന്റെ പ്രകാശം നൂറുൽ ഉലമ	BG212	ABDUL HAKEEM SAADI	400	Available	Malayalam	Biography	ICF MUSAFFA
ശംസുൽ ഉലമ കീഴന്ന ഓർ	BG213	NAJEEB MOULVI	200	Available	Malayalam	Biography	KERALA SAMASTHANA JAMIYYATHUL ULAMA
A. P MUHAMMAD MUSLIYAR KANDAPURAM	BG214	IPB BOOKS	400	Available	Malayalam	Biography	IPB 
ഇ. കെ. ഹസ്സൻമുസ്ലിയാർ	BG215	JAMIA HASANIYA	1200	Available	Malayalam	Biography	JAMIA HASANIYA ISLAMIYA
ഉസ്മാൻ ബിൻ അഫ്ഫാൻ	BG216	SAYYID SWALAHUDHEEN BHUKARI	450	Available	Malayalam	Biography	IPB
അൽ ആമീൻ	BG217	P. K. MUHAMMAD KUNJI	100	Available	Malayalam	Biography	KERALA SAHITYA AKADIMI
ഇമാം റാസി	BG218	DR. MUHAMMAD FAROOK BHUKARI	150	Available	Malayalam	Biography	IPB
ഇമാം ശഅരാനി	BG219	MAMOON HODAVI	250	Available	Malayalam	Biography	BOOKS PLUS
ഖലീഫ ഉമറിന്റെ രാഷ്ട്രവും രാഷ്ട്രീയവും	BG220	M JABIR BUQARI	240	Available 	Malayalam	Biography	IPB BOOK
`;

async function uploadBooks() {
    try {
        await connectToDB();
        console.log("Connected to database");

        const lines = rawData.trim().split("\n");
        const books = [];

        for (const line of lines) {
            const parts = line.split("\t");
            if (parts.length < 2) continue;

            const name = parts[0].trim();
            const id = parts[1].trim();
            const author = parts[2]?.trim() || "";
            const price = parseFloat(parts[3]?.trim()) || 0;
            const status = parts[4]?.trim() || "Available";
            const language = parts[5]?.trim() || "Malayalam";
            const category = parts[6]?.trim() || "Biography";
            const publication = parts[7]?.trim() || "";

            // Extract prefix and number from ID (e.g., BG01 -> BG, 01)
            const match = id.match(/^([a-zA-Z]+)(\d+)$/);
            const prefix = match ? match[1] : "";
            const number = match ? match[2] : id;

            books.push({
                id,
                prefix,
                number,
                name,
                author,
                price,
                status,
                language,
                category,
                publication
            });
        }

        console.log(`Parsed ${books.length} books. Starting upload...`);

        let count = 0;
        for (const book of books) {
            await LibraryBook.findOneAndUpdate(
                { id: book.id },
                book,
                { upsert: true, new: true }
            );
            count++;
            if (count % 20 === 0) {
                console.log(`Uploaded ${count} books...`);
            }
        }

        console.log(`Successfully uploaded ${count} books.`);
        process.exit(0);
    } catch (error) {
        console.error("Error uploading books:", error);
        process.exit(1);
    }
}

uploadBooks();
