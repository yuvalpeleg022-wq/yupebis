# Authoring script for data/real-2026-27/*.json. Every fact below comes from the cited sources
# (web research on 2026-11-03). Run: python3 scripts/build-real-2026-27.py data/real-2026-27
import json, re, unicodedata, sys
out = sys.argv[1]
ACC = "2026-11-03"
M = "Web search result summary; direct page fetch blocked by session network policy, primary page not opened"
S = {}
def src(id, title, url, pub): S[id] = dict(id=id, title=title, url=url, publisher=pub, accessedOn=ACC, method=M)
# --- NBA
src("s_realgm_hc","Current NBA Head Coaches (undated table)","https://basketball.realgm.com/nba/staff-members/20/Head-Coach/Current","RealGM")
src("s_nba_carousel","2026 NBA coaching carousel","https://sports.yahoo.com/nba/article/2026-nba-coaching-carousel-power-ranking-the-job-openings-from-worst-to-best-191025778.html","Yahoo Sports")
src("s_wiki_raptors","2026–27 Toronto Raptors season","https://en.wikipedia.org/wiki/2026%E2%80%9327_Toronto_Raptors_season","Wikipedia")
src("s_wiki_wizards","2026–27 Washington Wizards season","https://en.wikipedia.org/wiki/2026%E2%80%9327_Washington_Wizards_season","Wikipedia")
src("s_wiki_clippers","2026–27 Los Angeles Clippers season","https://en.wikipedia.org/wiki/2026%E2%80%9327_Los_Angeles_Clippers_season","Wikipedia")
src("s_wiki_grizzlies","2026–27 Memphis Grizzlies season","https://en.wikipedia.org/wiki/2026%E2%80%9327_Memphis_Grizzlies_season","Wikipedia")
src("s_yardbarker_pacific","2026-27 NBA Preview: Pacific Division capsules","https://www.yardbarker.com/nba/articles/2026_27_nba_preview_pacific_division_capsules/s1_17045_44444978","Yardbarker")
src("s_espn_pressure","NBA preview 2026-27: Five coaches facing the most pressure","https://www.espn.com/nba/story/_/id/50069752/nba-preview-2026-27-76ers-nurse-spurs-johnson-five-coaches-pressure","ESPN")
src("s_heat_roundtable","Erik Spoelstra on the Miami Heat (Sep 28, 2026)","https://roundtable.io/sports/nba/heat/news/erik-spoelstra-on-the-miami-heat-naturally-turning-the-page","Roundtable")
src("s_heavy_celtics","Celtics make major decision on next season's head coach","https://heavy.com/sports/nba/boston-celtics/celtics-major-decision-head-coach/","Heavy")
src("s_hr_nets","Nets coach Jordi Fernandez and staff receive extensions (Apr 2026)","https://www.hoopsrumors.com/2026/04/nets-coach-jordi-fernandez-and-staff-receive-extensions.html","Hoops Rumors")
src("s_hr_hornets","Hornets sign Charles Lee to multiyear extension (May 2026)","https://www.hoopsrumors.com/2026/05/hornets-sign-charles-lee-to-multiyear-extension.html","Hoops Rumors")
src("s_nba_donovan","The Athletic: Spurs to reportedly hire Billy Donovan as lead assistant coach","https://www.nba.com/news/the-athletic-spurs-hire-billy-donovan-as-lead-assistant-coach","NBA.com")
src("s_suntimes_donovan","Former Bulls coach Billy Donovan joins Spurs staff (Jul 2, 2026)","https://chicago.suntimes.com/bulls/2026/07/02/former-bulls-coach-billy-donovan-joins-san-antonio-spurs-staff-report","Chicago Sun-Times")
src("s_nba_bulls_staff","Chicago Bulls finalize Tiago Splitter's coaching staff for 2026-27","https://www.nba.com/news/chicago-bulls-finalize-coaching-staff-2026-27","NBA.com")
src("s_si_hawks_staff","Hawks make three key hires to Quin Snyder's coaching staff","https://www.si.com/nba/hawks/onsi/hawks-make-three-key-hires-to-quin-snyder-s-coaching-staff-ahead-of-2026-2027-season-01m2nx8ksfgd","Sports Illustrated")
# --- EuroLeague
src("s_wiki_el_tx","List of 2026–27 EuroLeague transactions","https://en.wikipedia.org/wiki/List_of_2026%E2%80%9327_EuroLeague_transactions","Wikipedia")
src("s_el_coaches_meeting","EuroLeague coaches reconvene in Barcelona (2026)","https://www.euroleaguebasketball.net/en/news/euroleague-coaches-reconvene-in-barcelona-reflect-on-2025-26-and-look-toward-2026-27-season/","Euroleague Basketball")
src("s_twowayhoops_el","EuroLeague 2026-27 Preview: All 20 Teams","https://twowayhoops.substack.com/p/euroleague-2026-27-preview-teams-rosters-transfers","Two Way Hoops")
src("s_eurohoops_baskonia","Galbiati and Baskonia part ways, Perasovic takes over","https://www.eurohoops.net/en/euroleague/2020854/galbiati-and-baskonia-have-parted-ways-perasovic-to-take-over/","Eurohoops")
src("s_eurohoops_field","EuroLeague confirms 20-team field","https://www.eurohoops.net/en/euroleague/1984894/euroleague-confirms-20-team-field-expansion-plans-and-franchise-roadmap/","Eurohoops")
src("s_eurohoops_preview","Euroleague 2026-27 is here: preview of the season","https://www.eurohoops.net/en/euroleague/2011374/euroleague-2026-27-is-here-enjoy-the-preview-of-the-season/","Eurohoops")
src("s_paris_fener","Paris Basketball 2026-27 opponent page: Fenerbahçe Beko","https://parisbasketball.com/en/adversaire/fenerbahce-beko-istanbul-2/","Paris Basketball")
src("s_talkbasket_saras","Fenerbahce locks in Sarunas Jasikevicius with three-year deal","https://www.talkbasket.net/210137-fenerbahce-locks-in-sarunas-jasikevicius-with-three-year-deal","TalkBasket")
src("s_efes_practice","Anadolu Efes first practice of the new season (25 Aug 2026)","https://www.anadoluefessk.org/en/news/c2mArht2xL1zEI52DovIqw==","Anadolu Efes (official)")
src("s_maccabi_miller","Kenny Miller appointed head coach (Jun 2026)","https://www.maccabi-tlv.co.il/en/2026/06/kenny-miller-appointed-head-coach/","Maccabi Tel Aviv (official)")
src("s_eurohoops_hapoel","Hapoel Tel Aviv signs Eugene German (Aug 2026)","https://www.eurohoops.net/en/euroleague/1995735/hapoel-tel-aviv-signs-eugene-german/","Eurohoops")
src("s_eurohoops_bayern","Anton Gavel returns to Bayern as the new head coach","https://www.eurohoops.net/en/euroleague/1985744/anton-gavel-new-head-coach-bayern-euroleague/","Eurohoops")
src("s_bayern_gavel","Anton Gavel — FC Bayern Basketball staff page","https://fcbayern.com/basketball/en/teams/functional-team/anton-gavel","FC Bayern Basketball (official)")
src("s_dubai_staff","Xavi Pascual's staff for the 2026-27 season confirmed","https://dubaibasketball.com/basketball/xavi-pascuals-staff-for-the-2026-27-season-confirmed/","Dubai Basketball (official)")
src("s_eurohoops_besiktas","Besiktas extend coach Dusan Alimpijevic until 2027-28","https://www.eurohoops.net/en/euroleague/1990646/besiktas-extend-coach-dusan-alimpijevic-until-the-end-of-the-2027-28-season/","Eurohoops")
src("s_el_messina_poeta","Ettore Messina steps down as Milan head coach, replaced by Peppe Poeta","https://www.euroleaguebasketball.net/euroleague/news/ettore-messina-steps-down-as-milan-head-coach-to-be-replaced-by-peppe-poeta","Euroleague Basketball")
src("s_eurohoops_paris","Max Lefevre new Paris head coach","https://www.eurohoops.net/en/euroleague/1993163/max-lefevre-new-paris-head-coach-euroleague/","Eurohoops")
src("s_paris_staff","Peter Dominguez and Michael Fallone Jr join the Paris Basketball coaching staff","https://parisbasketball.com/en/2026/09/peter-dominguez-and-michael-fallone-jr-join-the-paris-basketball-coaching-staff/","Paris Basketball (official)")
src("s_zalgiris_masiulis","Tomas Masiulis (profile mirror)","https://wikwiand-revamp.pages.dev/en/Tomas_Masiulis","Wikipedia mirror")
src("s_zalgiris_teams","EuroLeague confirms next season's teams and start date","https://zalgiris.lt/en/naujienos/euroleague-confirms-next-season-s-teams-and-start-date","BC Žalgiris (official)")
src("s_eurohoops_olympiacos","Bartzokas: 'You can go from Messiah to completely clueless' (Sep 2026)","https://www.eurohoops.net/en/trademarks/2006043/giorgos-bartzokas-talks-olympiacos-new-season-euroleague/","Eurohoops")
src("s_eurohoops_scariolo","Sergio Scariolo joins Roma SPQR as strategic advisor","https://www.eurohoops.net/en/eurocup/1999715/sergio-scariolo-joins-roma-spqr-as-strategic-advisor/","Eurohoops")
src("s_protothema_ataman","Ergin Ataman leaves Panathinaikos (Jun 15, 2026)","https://en.protothema.gr/2026/06/15/ergin-ataman-leaves-panathinaikos-reports-suggest-contact-with-obradovic/","Proto Thema")
# --- Domestic
src("s_acb_banquillos","La radiografía de los banquillos de la Liga Endesa 2026-27","https://acb.com/es/liga/noticias/la-radiografia-de-los-banquillos-de-la-liga-endesa-2026-27-146096","ACB (official)")
src("s_gigantes_mercado","Tabla de mercado de la Liga Endesa 2026-27","https://www.gigantes.com/liga-endesa/tabla-de-mercado-de-la-liga-endesa-fichajes-bajas-y-rumores-para-la-temporada-2026-27/","Gigantes")
src("s_wiki_acb","Liga ACB 2026-27","https://es.wikipedia.org/wiki/Liga_ACB_2026-27","Wikipedia (es)")
src("s_wiki_bsl","2026–27 Basketbol Süper Ligi","https://en.wikipedia.org/wiki/2026%E2%80%9327_Basketbol_S%C3%BCper_Ligi","Wikipedia")
src("s_wiki_isr","2026–27 Israeli Basketball Premier League","https://en.wikipedia.org/wiki/2026%E2%80%9327_Israeli_Basketball_Premier_League","Wikipedia")
src("s_wiki_hasin","Elad Hasin","https://en.wikipedia.org/wiki/Elad_Hasin","Wikipedia")
src("s_wiki_guni","Guni Israeli","https://en.wikipedia.org/wiki/Guni_Israeli","Wikipedia")
src("s_sky_lba","Serie A basket 2026 2027: squadre, quintetti e roster","https://sport.sky.it/basket/serie-a/serie-a-basket-2026-2027-squadre-quintetti-roster","Sky Sport Italia")
src("s_bebasket_transfers","Tous les transferts et les effectifs des clubs de Betclic ÉLITE 2026/27","https://www.bebasket.fr/tous-les-transferts-et-les-effectifs-des-clubs-de-betclic-elite-pour-la-saison-2026-27","BeBasket")
src("s_basketeurope_launch","Lancement de la saison 2026-27 de Betclic Elite","https://www.basketeurope.com/lancement-ce-vendredi-de-la-saison-2026-27-de-betclic-elite/","BasketEurope")
src("s_twowayhoops_lnb","French Betclic ÉLITE 2026–27 Preview","https://twowayhoops.substack.com/p/betclic-elite-2026-27-preview","Two Way Hoops")
src("s_wiki_gbl_bios","Greek coach biographies (Ziagkos, Vovoras, Kantzouris, Dedas)","https://en.wikipedia.org/wiki/Vangelis_Ziagkos","Wikipedia")
src("s_bbl_preview_2025","easyCredit BBL season preview 2025/26","https://easycredit-bbl.de/de/n/news/2025/september/season-preview-60th-season-with-the-league-of-champions-18-teams-6-german-coaches-germans-big-names-return","easyCredit BBL (official)")

clubs = []
def club(ref, name, short, city, cty, league, part, sources, notes=""):
    clubs.append(dict(ref=ref, name=name, shortName=short, city=city, country=cty, league=league, participation=part, sources=sources, notes=notes))
nba = [("ATL","Atlanta Hawks","Atlanta"),("BOS","Boston Celtics","Boston"),("BKN","Brooklyn Nets","Brooklyn"),("CHA","Charlotte Hornets","Charlotte"),("CHI","Chicago Bulls","Chicago"),("CLE","Cleveland Cavaliers","Cleveland"),("DAL","Dallas Mavericks","Dallas"),("DEN","Denver Nuggets","Denver"),("DET","Detroit Pistons","Detroit"),("GSW","Golden State Warriors","San Francisco"),("HOU","Houston Rockets","Houston"),("IND","Indiana Pacers","Indianapolis"),("LAC","Los Angeles Clippers","Los Angeles"),("LAL","Los Angeles Lakers","Los Angeles"),("MEM","Memphis Grizzlies","Memphis"),("MIA","Miami Heat","Miami"),("MIL","Milwaukee Bucks","Milwaukee"),("MIN","Minnesota Timberwolves","Minneapolis"),("NOP","New Orleans Pelicans","New Orleans"),("NYK","New York Knicks","New York"),("OKC","Oklahoma City Thunder","Oklahoma City"),("ORL","Orlando Magic","Orlando"),("PHI","Philadelphia 76ers","Philadelphia"),("PHX","Phoenix Suns","Phoenix"),("POR","Portland Trail Blazers","Portland"),("SAC","Sacramento Kings","Sacramento"),("SAS","San Antonio Spurs","San Antonio"),("TOR","Toronto Raptors","Toronto"),("UTA","Utah Jazz","Salt Lake City"),("WAS","Washington Wizards","Washington")]
for c,n,city in nba: club("nba:"+c.lower(), n, c, city, "CAN" if c=="TOR" else "USA", "nba", "reported", ["s_realgm_hc"])
EL = [("rma","Real Madrid","RMB","Madrid","ESP","reported",["s_wiki_el_tx"],"acb"),("fcb","FC Barcelona","BAR","Barcelona","ESP","reported",["s_wiki_el_tx"],"acb"),
 ("val","Valencia Basket","VAL","Valencia","ESP","reported",["s_wiki_el_tx"],"acb"),("bkn","Baskonia","BKN","Vitoria-Gasteiz","ESP","reported",["s_eurohoops_baskonia"],"acb"),
 ("pao","Panathinaikos","PAO","Athens","GRC","reported",["s_wiki_el_tx"],"gbl"),("oly","Olympiacos","OLY","Piraeus","GRC","reported",["s_eurohoops_olympiacos"],"gbl"),
 ("fen","Fenerbahçe","FEN","Istanbul","TUR","reported",["s_paris_fener"],"bsl"),("efs","Anadolu Efes","EFS","Istanbul","TUR","reported",["s_efes_practice"],"bsl"),
 ("bjk","Beşiktaş","BJK","Istanbul","TUR","reported",["s_eurohoops_field","s_eurohoops_besiktas"],"bsl"),("mta","Maccabi Tel Aviv","MTA","Tel Aviv","ISR","reported",["s_maccabi_miller"],"isr"),
 ("hta","Hapoel Tel Aviv","HTA","Tel Aviv","ISR","reported",["s_eurohoops_hapoel"],"isr"),("czv","Crvena Zvezda","CZV","Belgrade","SRB","reported",["s_el_coaches_meeting"],None),
 ("par","Partizan","PAR","Belgrade","SRB","reported",["s_el_coaches_meeting"],None),("zal","Žalgiris","ZAL","Kaunas","LTU","reported",["s_zalgiris_teams"],None),
 ("bay","Bayern Munich","BAY","Munich","DEU","reported",["s_eurohoops_bayern"],"bbl"),("vir","Virtus Bologna","VIR","Bologna","ITA","reported",["s_wiki_el_tx"],"lba"),
 ("mil","Olimpia Milano","MIL","Milan","ITA","reported",["s_el_messina_poeta"],"lba"),("asv","ASVEL","ASV","Villeurbanne","FRA","reported",["s_twowayhoops_el"],"lnb"),
 ("prs","Paris Basketball","PRS","Paris","FRA","reported",["s_eurohoops_field","s_eurohoops_paris"],"lnb"),("dub","Dubai Basketball","DUB","Dubai","ARE","reported",["s_dubai_staff"],None)]
for r,n,s,city,cty,p,srcs,dom in EL:
    club("el:"+r, n, s, city, cty, "euroleague", p, srcs, f"Also competes domestically ({dom}); domestic schedule not simulated yet." if dom else "")
dom = {
 "acb":[("joventut","Joventut Badalona","JOV","Badalona"),("girona","Bàsquet Girona","GIR","Girona"),("lleida","Força Lleida","LLE","Lleida"),("tenerife","CB Canarias (Tenerife)","TEN","La Laguna"),("bilbao","Bilbao Basket","BIL","Bilbao"),("unicaja","Unicaja","UNI","Málaga"),("murcia","UCAM Murcia","MUR","Murcia"),("burgos","Burgos","BUR","Burgos"),("zaragoza","Basket Zaragoza","ZAR","Zaragoza"),("coruna","Leyma Coruña","COR","A Coruña"),("andorra","MoraBanc Andorra","AND","Andorra la Vella"),("grancanaria","Gran Canaria","GCA","Las Palmas"),("manresa","Manresa","MAN","Manresa"),("granada","Covirán Granada","GRA","Granada")],
 "bsl":[("korfez","Biotekno Körfez Basket","KOR","Kocaeli"),("bandirma","Bandırma Bordo","BAN","Bandırma"),("tofas","Tofaş","TOF","Bursa"),("bahcesehir","Bahçeşehir Koleji","BAH","Istanbul"),("karsiyaka","Karşıyaka Basket","KSK","Izmir"),("galatasaray","Galatasaray","GSY","Istanbul")],
 "gbl":[("mykonos","Mykonos","MYK","Mykonos"),("promitheas","Promitheas Patras","PRO","Patras"),("iraklis","Iraklis Thessaloniki","IRA","Thessaloniki"),("paok","PAOK","PAOK","Thessaloniki"),("aris","Aris Thessaloniki","ARI","Thessaloniki")],
 "isr":[("herzliya","Bnei Herzliya","HER","Herzliya"),("ramatgan","Maccabi Ramat Gan","MRG","Ramat Gan"),("beersheva","Hapoel Be'er Sheva","HBS","Be'er Sheva"),("eilat","Hapoel Ironi Eilat","EIL","Eilat"),("ashdod","Maccabi Ashdod","ASH","Ashdod")],
 "lba":[("cantu","Pallacanestro Cantù","CAN","Cantù"),("romaspqr","BC Roma SPQR","RSP","Rome"),("trento","Dolomiti Energia Trentino","TRE","Trento"),("scafati","Scafati Basket","SCA","Scafati"),("maximaroma","Maxima Roma","MXR","Rome"),("trieste","Pallacanestro Trieste","TRI","Trieste"),("reggiana","Pallacanestro Reggiana","REG","Reggio Emilia")],
 "lnb":[("saintquentin","Saint-Quentin Basket","SQB","Saint-Quentin"),("bourg","JL Bourg","JLB","Bourg-en-Bresse"),("monaco","AS Monaco","MCO","Monaco"),("cholet","Cholet Basket","CHO","Cholet"),("chalon","Élan Chalon","CHA","Chalon-sur-Saône"),("nancy","SLUC Nancy","NAN","Nancy"),("lemans","Le Mans Sarthe","LMS","Le Mans")],
 "bbl":[("trier","Gladiators Trier","TRI","Trier"),("bamberg","Bamberg Baskets","BAM","Bamberg"),("frankfurt","Skyliners Frankfurt","FRA","Frankfurt"),("wurzburg","Würzburg Baskets","WUE","Würzburg"),("braunschweig","Basketball Löwen Braunschweig","BRA","Braunschweig"),("ludwigsburg","MHP Riesen Ludwigsburg","LUD","Ludwigsburg"),("jena","Science City Jena","JEN","Jena")],
}
domsrc = {"acb":["s_acb_banquillos","s_wiki_acb"],"bsl":["s_wiki_bsl"],"gbl":["s_wiki_gbl_bios"],"isr":["s_wiki_isr"],"lba":["s_sky_lba"],"lnb":["s_bebasket_transfers","s_basketeurope_launch"],"bbl":["s_bbl_preview_2025"]}
ctry = {"acb":"ESP","bsl":"TUR","gbl":"GRC","isr":"ISR","lba":"ITA","lnb":"FRA","bbl":"DEU"}
for lg, lst in dom.items():
    for r,n,s,city in lst:
        cty = "MCO" if r=="monaco" else ("AND" if r=="andorra" else ctry[lg])
        club(f"{lg}:{r}", n, s, city, cty, lg, "reported", domsrc[lg], "Database-only club: domestic league not yet playable; participates in the coaching market.")

coaches = []
def slug(s): return re.sub(r"[^a-z0-9]+","-",unicodedata.normalize("NFD",s).encode("ascii","ignore").decode().lower()).strip("-")
def coach(first, last, status, club=None, role="head_coach", sources=(), notes="", since=None, employment=None):
    a = dict(club=club, role=role, season=2026, since=since) if club else None
    coaches.append(dict(ref="coach:"+slug(first+" "+last), firstName=first, lastName=last, nationality=None, birthDate=None, status=status,
        sources=list(sources), assignment=a, employment=employment or ("employed" if club else "unknown"), careerHistory=[],
        missingFields=["nationality","birthDate","careerHistory"], notes=notes))
# NBA head coaches
for f,l,c,s in [("Quin","Snyder","atl",["s_realgm_hc"]),("Joe","Mazzulla","bos",["s_heavy_celtics"]),("Jordi","Fernández","bkn",["s_hr_nets"]),("Charles","Lee","cha",["s_hr_hornets"]),
 ("Tiago","Splitter","chi",["s_realgm_hc","s_nba_bulls_staff"]),("Kenny","Atkinson","cle",["s_realgm_hc"]),("Dusty","May","dal",["s_realgm_hc","s_nba_carousel"]),("David","Adelman","den",["s_realgm_hc"]),
 ("J.B.","Bickerstaff","det",["s_realgm_hc"]),("Steve","Kerr","gsw",["s_realgm_hc"]),("Ime","Udoka","hou",["s_realgm_hc"]),("Rick","Carlisle","ind",["s_realgm_hc"]),
 ("Tyronn","Lue","lac",["s_wiki_clippers"]),("JJ","Redick","lal",["s_yardbarker_pacific"]),("Tuomas","Iisalo","mem",["s_wiki_grizzlies"]),("Erik","Spoelstra","mia",["s_heat_roundtable"]),
 ("Taylor","Jenkins","mil",["s_realgm_hc","s_nba_carousel"]),("Chris","Finch","min",["s_realgm_hc"]),("Jamahl","Mosley","nop",["s_realgm_hc","s_nba_carousel"]),("Mike","Brown","nyk",["s_realgm_hc"]),
 ("Mark","Daigneault","okc",["s_realgm_hc"]),("Sean","Sweeney","orl",["s_realgm_hc","s_nba_carousel"]),("Nick","Nurse","phi",["s_espn_pressure"]),("Jordan","Ott","phx",["s_realgm_hc"]),
 ("Micah","Nori","por",["s_realgm_hc","s_nba_carousel"]),("Doug","Christie","sac",["s_realgm_hc"]),("Mitch","Johnson","sas",["s_realgm_hc"]),("Darko","Rajaković","tor",["s_wiki_raptors"]),
 ("Will","Hardy","uta",["s_realgm_hc"]),("Brian","Keefe","was",["s_wiki_wizards"])]:
    coach(f,l,"reported","nba:"+c,"head_coach",s)
# NBA assistants
coach("Billy","Donovan","reported","nba:sas","assistant_coach",["s_nba_donovan","s_suntimes_donovan"],"Lead assistant under Mitch Johnson (reported Jul 2026). Former Bulls head coach (stepped down Apr 2026).")
for f,l,n in [("Wes","Unseld Jr.","Third season as assistant."),("Blake","Ahearn","Joined from Memphis Grizzlies staff."),("Rex","Kalamian","Joined after three seasons with the Bucks.")]:
    coach(f,l,"reported","nba:chi","assistant_coach",["s_nba_bulls_staff"],n)
coach("Jason","Love","reported","nba:atl","assistant_coach",["s_si_hawks_staff"],"Former Bucks assistant.")
coach("Ettore","Messina","reported","nba:atl","assistant_coach",["s_si_hawks_staff","s_el_messina_poeta"],"Hired as coaching consultant (modelled as assistant). Stepped down as Olimpia Milano head coach (Nov 2025).")
# EuroLeague head coaches
for f,l,c,s,since,n in [("Pedro","Martínez","rma",["s_wiki_el_tx","s_acb_banquillos"],"2026-07-06",""),("Aleksander","Sekulić","fcb",["s_wiki_el_tx","s_acb_banquillos"],"2026-07-22",""),
 ("Xavi","Albert","val",["s_wiki_el_tx","s_gigantes_mercado"],"2026-07-07",""),("Velimir","Perasović","bkn",["s_eurohoops_baskonia","s_wiki_acb"],"2026-10-14","Replaced Paolo Galbiati."),
 ("Željko","Obradović","pao",["s_wiki_el_tx"],"2026-06-21",""),("Georgios","Bartzokas","oly",["s_eurohoops_olympiacos","s_eurohoops_preview"],None,"Contract end date unconfirmed (sources disagree)."),
 ("Šarūnas","Jasikevičius","fen",["s_paris_fener","s_talkbasket_saras"],None,"Extension reportedly through 2028-29 (article undated)."),("Pablo","Laso","efs",["s_efes_practice"],None,"Contract through 2026-27."),
 ("Dušan","Alimpijević","bjk",["s_eurohoops_besiktas"],None,"Extended through 2027-28 (Jul 2026)."),("Kenny","Miller","mta",["s_maccabi_miller"],"2026-06","Club announcement; other listings still name Oded Kattash."),
 ("Dimitris","Itoudis","hta",["s_eurohoops_hapoel"],None,"Contract reportedly to 2027."),("Ibon","Navarro","czv",["s_el_coaches_meeting","s_twowayhoops_el"],None,""),
 ("Joan","Peñarroya","par",["s_el_coaches_meeting"],None,""),("Tomas","Masiulis","zal",["s_zalgiris_masiulis"],None,"Head coach since June 2025; no explicit 2026-27 club statement found."),
 ("Anton","Gavel","bay",["s_eurohoops_bayern","s_bayern_gavel"],"2026-06-29","Contract to 30 Jun 2029."),("Álex","Mumbrú","vir",["s_wiki_el_tx"],"2026-06-19",""),
 ("Giuseppe","Poeta","mil",["s_el_messina_poeta"],"2025-11","Took over from Messina in Nov 2025; 2026-27 continuation expected, no explicit contract statement found."),
 ("Tony","Parker","asv",["s_twowayhoops_el","s_basketeurope_launch"],None,""),("Maxime","Lefèvre","prs",["s_eurohoops_paris","s_bebasket_transfers"],"2026-07-22","Former Minnesota Timberwolves staff."),
 ("Xavi","Pascual","dub",["s_dubai_staff"],"2026-07","Three-year deal through 2029.")]:
    coach(f,l,"reported","el:"+c,"head_coach",s,n,since)
# EuroLeague assistants
for f,l in [("Íñigo","Zorzano"),("Adam","Panagiotopoulos"),("Òscar","Orellana"),("Velibor","Njegovanović"),("Jan","Šentjurc")]:
    coach(f,l,"reported","el:dub","assistant_coach",["s_dubai_staff"])
coach("Arne","Woltmann","reported","el:bay","assistant_coach",["s_eurohoops_bayern"],"Lead assistant; previously with Gavel at Bamberg.")
coach("Pierric","Poupet","reported","el:prs","assistant_coach",["s_eurohoops_paris"],"Assistant head coach; formerly ASVEL head coach.")
for f,l in [("Peter","Dominguez"),("Bienvenu","Kindoki"),("Giovanni","Spessotto"),("Michael","Fallone Jr.")]:
    coach(f,l,"reported","el:prs","assistant_coach",["s_paris_staff"])
# ACB
for f,l,c in [("Dani","Miret","joventut"),("Moncho","Fernández","girona"),("Gerard","Encuentra","lleida"),("Jaka","Lakovič","tenerife"),("Jaume","Ponsarnau","bilbao"),
 ("Txus","Vidorreta","unicaja"),("Sito","Alonso","murcia"),("Gonzalo","García de Vitoria","zaragoza"),("Carles","Marco","coruna")]:
    coach(f,l,"reported","acb:"+c,"head_coach",["s_acb_banquillos","s_gigantes_mercado"])
coach("Porfirio","Fisac","conflicting",None,"head_coach",["s_gigantes_mercado"],"Burgos: renewal reported, but sources disagree on Burgos. Not assigned. (First name given as 'Porfi' in source.)")
coach("Žan","Tabak","unverified",None,"head_coach",["s_acb_banquillos"],"Andorra: 'signed until end of season' — unclear whether this covers 2026-27. Not assigned.")
# BSL
for f,l,c,since in [("Serhan","Kavut","korfez",None),("Tutku","Açık","bandirma",None),("Massimo","Cancellieri","tofas","2026-05"),("Aleksandar","Đorđević","bahcesehir","2026-06-12"),
 ("Nenad","Marković","karsiyaka","2026-07-29"),("Manuchar","Markoishvili","galatasaray","2026-10-16")]:
    coach(f,l,"reported","bsl:"+c,"head_coach",["s_wiki_bsl"],"",since)
# Israel
coach("Yehu","Orland","reported","isr:herzliya","head_coach",["s_wiki_isr"])
coach("Elad","Hasin","reported","isr:ramatgan","head_coach",["s_wiki_hasin"])
coach("Doug","Spradley","unverified",None,"head_coach",["s_wiki_isr"],"Hapoel Be'er Sheva: infobox may be outdated; club reportedly appointed a different coach for 2026-27. Not assigned.")
coach("Guni","Israeli","unverified",None,"head_coach",["s_wiki_guni"],"Reported head coach of Maccabi Ra'anana; that club's 2026-27 league status not confirmed. Not assigned.")
# LBA
for f,l,c in [("Frank","Vitucci","cantu"),("Alessandro","Magro","romaspqr"),("Alessandro","Rossi","trento"),("Piero","Bucchi","scafati"),("Matteo","Cotelli","maximaroma"),("Francesco","Taccetti","trieste")]:
    coach(f,l,"reported","lba:"+c,"head_coach",["s_sky_lba"])
coach("Dimitrios","Priftis","unverified",None,"head_coach",["s_wiki_gbl_bios"],"Profile links him to Reggiana; date unclear. Not assigned.")
# LNB
coach("Raphaël","Pascual","reported","lnb:saintquentin","head_coach",["s_bebasket_transfers","s_twowayhoops_lnb"],"Replaced Pedro Nuno Monteiro.")
coach("Freddy","Fauthoux","reported","lnb:bourg","head_coach",["s_basketeurope_launch"],"Suspended for matchday 1.")
# Greek (unverified)
coach("Vangelis","Ziagkos","unverified",None,"head_coach",["s_wiki_gbl_bios"],"Profile says he manages Mykonos; currency not confirmed. Not assigned.")
coach("Georgios","Vovoras","unverified",None,"head_coach",["s_wiki_gbl_bios"],"Profile links him to Promitheas Patras; date unclear. Not assigned.")
coach("Ilias","Kantzouris","conflicting",None,"head_coach",["s_wiki_gbl_bios"],"Linked to Iraklis as head coach and Aris as assistant. Not assigned.")
coach("Georgios","Dedas","reported","gbl:paok","assistant_coach",["s_wiki_gbl_bios"],"Joined PAOK as assistant after being dismissed in Feb 2026.")
# BBL
coach("Jacques","Schneider","unverified",None,"head_coach",["s_bbl_preview_2025"],"Gladiators Trier head coach per 2025/26 preview; 2026-27 not confirmed. Not assigned.")
# Real coaches without a current coaching job found (free-agent market)
for f,l,s,n in [("Ergin","Ataman",["s_protothema_ataman"],"Left Panathinaikos (Jun 2026); no new job found."),
 ("Paolo","Galbiati",["s_eurohoops_baskonia"],"Left Baskonia (14 Oct 2026)."),
 ("Gianmarco","Pozzecco",["s_wiki_bsl"],"Replaced at Galatasaray (16 Oct 2026)."),
 ("Sergio","Scariolo",["s_eurohoops_scariolo","s_wiki_el_tx"],"Left Real Madrid (2 Jul 2026); now a strategic advisor (non-coaching) at BC Roma SPQR."),
 ("Ahmet","Kandemir",["s_wiki_bsl"],"Replaced at Karşıyaka (29 Jul 2026)."),
 ("Marko","Barać",["s_wiki_bsl"],"Replaced at Bahçeşehir Koleji (12 Jun 2026)."),
 ("Murat Hüseyin","Yılmaz",["s_wiki_bsl"],"Replaced at Tofaş (May 2026)."),
 ("Pedro Nuno","Monteiro",["s_bebasket_transfers"],"Left Saint-Quentin (2026)."),
 ("Oded","Kattash",["s_maccabi_miller"],"Maccabi Tel Aviv appointed Kenny Miller (Jun 2026) after Kattash's April extension; current status unclear.")]:
    coach(f,l,"reported",None,"head_coach",s,n+" No current coaching job found as of 2026-11-03.",employment="unattached")
# Excluded / not usable
coach("Kevin","Ollie","incomplete",None,"head_coach",["s_hr_nets"],"Former Nets interim head coach (2024). Current status unknown.",employment="unknown")

assigned = {}
for c in coaches:
    a = c["assignment"]
    if a and a["role"]=="head_coach":
        assert a["club"] not in assigned, (a, assigned.get(a["club"]))
        assigned[a["club"]] = c["ref"]
refs = [c["ref"] for c in coaches]; assert len(refs)==len(set(refs)), "dup"
cref = {c["ref"] for c in clubs}
for c in coaches:
    if c["assignment"]: assert c["assignment"]["club"] in cref, c
    for s in c["sources"]: assert s in S, s
json.dump(list(S.values()), open(out+"/sources.json","w"), indent=1, ensure_ascii=False)
json.dump(clubs, open(out+"/clubs.json","w"), indent=1, ensure_ascii=False)
json.dump(coaches, open(out+"/coaches.json","w"), indent=1, ensure_ascii=False)
print(len(clubs),"clubs",len(coaches),"coaches",len(assigned),"HC assigned")
