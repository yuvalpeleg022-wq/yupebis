# Authoring script for data/real-2026-27/players.json, player-candidates.json and player-conflicts.json.
# Research: web search on 2026-11-03 (direct page fetches were blocked by the session network policy).
# Inclusion: confidence 'official' (club/league announcement cited) or 'cross_checked' (>=2 independent
# sources agree). Single-source mentions are recorded as candidates, contradicted ones as conflicts.
# No birth dates, heights, weights or statistics were present in any source: those fields stay null.
# Run: python3 scripts/build-real-players-2026-27.py data/real-2026-27
import json, re, sys, unicodedata
out = sys.argv[1]
ACC = "2026-11-03"
M = "Web search result summary; primary page not opened (session network policy)"
S = []
def src(i, t, u, p): S.append(dict(id=i, title=t, url=u, publisher=p, accessedOn=ACC, method=M))
# ---- sources (one or more per team search) ----
src("pl_bos","Boston Celtics 2026-27 roster (Basketball-Reference, RealGM, Fox Sports, BeBasket)","https://basketball.realgm.com/nba/teams/Boston-Celtics/2/Rosters/Current/2027","RealGM")
src("pl_bos2","2026-27 Boston Celtics Roster and Stats","https://www.basketball-reference.com/teams/BOS/2027.html","Basketball-Reference")
src("pl_atl","Atlanta Hawks projected starting lineup (Oct 2026)","https://www.si.com/nba/hawks/onsi/atlanta-hawks-projected-starting-lineup-after-re-signing-cj-mccollum-01kvp5enn40t","Sports Illustrated")
src("pl_atl2","Atlanta Hawks starting lineup ranked 10th best","https://roundtable.io/sports/nba/hawks/news/atlanta-hawks-starting-lineup-ranked-10th-best-in-nba","Roundtable")
src("pl_bkn","Predicting the Nets 2026-27 opening night starting lineup","https://www.yardbarker.com/nba/articles/predicting_the_nets_2026_27_opening_night_starting_lineup/s1_17133_43988695","Yardbarker")
src("pl_bkn2","Brooklyn Nets 2026-27 season preview","https://www.fantasyalarm.com/articles/nba/nba-offseason/brooklyn-nets-2026-27-season-preview/196823","Fantasy Alarm")
src("pl_cha","Charlotte Hornets starting lineup and rotation (post-LaMelo Ball era)","https://fadeawayworld.net/nba/charlotte-hornets/charlotte-hornets-starting-lineup-and-rotation-for-the-post-lamelo-ball-era","Fadeaway World")
src("pl_cha2","Charlotte Hornets 2026-27 season preview","https://www.fantasyalarm.com/articles/nba/nba-offseason/charlotte-hornets-2026-27-season-preview/197189","Fantasy Alarm")
src("pl_chi","Chicago Bulls projected lineup","https://fadeawayworld.net/nba/chicago-bulls/chicago-bulls-projected-lineup-featuring-caleb-wilson-dailyn-swain-and-nic-claxton","Fadeaway World")
src("pl_chi2","Chicago Bulls 2026-27 season preview","https://www.fantasyalarm.com/articles/nba/nba-offseason/chicago-bulls-2026-27-season-preview/196844","Fantasy Alarm")
src("pl_cle","Updated Cavaliers starting lineup after Peyton Watson trade","https://fansided.com/nba/updated-cavaliers-starting-lineup-and-rotation-after-peyton-watson-trade","FanSided")
src("pl_cle2","Cleveland Cavaliers 2026-27 season preview","https://www.fantasyalarm.com/articles/nba/nba-offseason/cleveland-cavaliers-2026-27-season-preview/196839","Fantasy Alarm")
src("pl_dal","Projecting the Mavericks starting lineup after Klay Thompson's exit","https://www.yardbarker.com/nba/articles/projecting_the_mavericks_starting_lineup_after_klay_thompsons_exit/s1_16622_44203677","Yardbarker")
src("pl_dal2","Evaluating the Mavericks' 2026-27 roster","https://fadeawayworld.net/?p=193568","Fadeaway World")
src("pl_den","2026-27 Nuggets roster, contracts, starting lineup, depth chart","https://www.si.com/nba/nuggets/onsi/2026-27-nuggets-roster-contracts-starting-lineup-depth-chart","Sports Illustrated")
src("pl_den2","Nikola Jokic approves new-look Nuggets roster","https://www.eurohoops.net/en/nba-news/2014684/nikola-jokic-talks-denver-nuggets-preseason-nba/","Eurohoops")
src("pl_det","Boston Celtics announce starting lineup for season opener against Detroit Pistons","https://tixel.com/us/news/2026/10/20/boston-celtics-announce-starting-lineup-for-season","Tixel")
src("pl_det2","One Pistons player whose starting spot is on life support","https://www.si.com/nba/pistons/onsi/one-current-pistons-player-whose-starting-spot-is-on-life-support-after-free-agency-01kyd72j65zb","Sports Illustrated")
src("pl_gsw","Warriors projected starting lineup and rotation for 2026-27","https://fadeawayworld.net/nba/golden-state-warriors/warriors-projected-starting-lineup-and-rotation-for-2026-27-not-even-a-play-in-team","Fadeaway World")
src("pl_gsw2","Breaking down the Warriors projected starting lineup as training camp opens","https://fansided.com/nba/breaking-down-the-warriors-projected-starting-lineup-and-rotation-as-training-camp-opens","FanSided")
src("pl_hou","Houston Rockets 2026-27 season preview","https://www.fantasyalarm.com/articles/nba/nba-offseason/houston-rockets-2026-27-season-preview/196836","Fantasy Alarm")
src("pl_hou2","Houston Rockets regular season rosters (2027)","https://basketball.realgm.com/nba/teams/Houston-Rockets/10/Rosters/Regular/2027","RealGM")
src("pl_ind","The most glaring hole on the Indiana Pacers roster","https://www.si.com/nba/pacers/onsi/the-most-glaring-hole-on-the-indiana-pacers-roster-01krrs2ny1f1","Sports Illustrated")
src("pl_ind2","Pacers projected 2026-27 rotation after additions of 3 new players","https://roundtable.io/sports/nba/pacers/news/pacers-projected-2026-27-rotation-after-additions-of-3-new-players","Roundtable")
src("pl_lac","LA Clippers 2026-27 season preview","https://www.fantasyalarm.com/articles/nba/nba-offseason/la-clippers-2026-27-season-preview/196385","Fantasy Alarm")
src("pl_lac2","LAC roster","https://www.statmuse.com/nba/ask/lac-roster","StatMuse")
src("pl_lal","Lakers active roster 2026-27 (Bleacher Report)","https://bleacherreport.com/articles/25426456-lakers-active-roster-draft-class-2026-27-salary-info-and-free-agents-after-nba-draft-results","Bleacher Report")
src("pl_lal2","Los Angeles Lakers 2026-27 season preview","https://www.fantasyalarm.com/articles/nba/nba-offseason/los-angeles-lakers-2026-27-season-preview/196386","Fantasy Alarm")
src("pl_mem","Memphis Grizzlies 2026-27 season preview","https://www.fantasyalarm.com/articles/nba/nba-offseason/memphis-grizzlies-2026-27-season-preview/196011","Fantasy Alarm")
src("pl_mem2","Memphis Grizzlies roster (Legion Report)","https://legionreport.com/?p=44796","Legion Report")
src("pl_mia","Miami Heat roster (Legion Report)","https://legionreport.com/?p=44797","Legion Report")
src("pl_mia2","Miami Heat roster, contracts and depth chart for 2026-27","https://www.si.com/nba/heat/onsi/miami-heat-roster-contracts-salaries-options-and-depth-chart-for-2026-27-01kz94q8ekmz","Sports Illustrated")
src("pl_nbapr","2026-27 NBA rosters by the numbers","https://www.nba.com/news/2026-27-rosters-by-the-numbers","NBA.com")
src("pl_min","NBA, il roster di Minnesota per la stagione 2026-27","https://sport.sky.it/nba/2026/08/27/nba-minnesota-timberwolves-roster-2026-2027","Sky Sport Italia")
src("pl_min2","Projected Timberwolves starting lineup after adding Jonathan Kuminga","https://fansided.com/nba/projected-timberwolves-starting-lineup-and-rotation-after-adding-jonathan-kuminga","FanSided")
src("pl_nop","New Orleans Pelicans 2026-27 season preview","https://www.fantasyalarm.com/articles/nba/nba-offseason/new-orleans-pelicans-2026-27-season-preview/196833","Fantasy Alarm")
src("pl_nop2","Pelicans active roster 2026-27 (Bleacher Report)","https://bleacherreport.com/articles/25426401-pelicans-active-roster-draft-class-2026-27-salary-info-and-free-agents-after-nba-draft-results","Bleacher Report")
src("pl_okc","2026-27 OKC Thunder roster, contracts and depth chart","https://www.si.com/nba/thunder/onsi/2026-27-okc-thunder-roster-contracts-salaries-options-and-depth-chart","Sports Illustrated")
src("pl_okc2","Oklahoma City Thunder roster (Legz)","https://www.legz.com.au/nba/teams/oklahoma-city-thunder/roster","Legz")
src("pl_orl","Orlando Magic 2026-27 season preview","https://www.fantasyalarm.com/articles/nba/nba-offseason/orlando-magic-2026-27-season-preview/197145","Fantasy Alarm")
src("pl_orl2","Orlando Magic regular season rosters (2027)","https://basketball.realgm.com/nba/teams/Orlando-Magic/21/Rosters/Regular/2027","RealGM")
src("pl_phi","Philadelphia 76ers roster after Jaylen Brown trade","https://thesportscast.net/2026/07/02/philadelphia-76ers-roster-salary-cap-pending-free-agents-and-team-options-after-jaylen-brown-trade/","The Sportscast")
src("pl_phi2","How Lakers will make NBA history after LeBron's decision to leave for the 76ers","https://bleacherreport.com/articles/25481832-how-lakers-will-make-nba-history-wild-stat-revealed-after-lebrons-decision-leave-76ers","Bleacher Report")
src("pl_wiki_brown","Jaylen Brown","https://en.wikipedia.org/wiki/Jaylen_Brown","Wikipedia")
src("pl_phx","Phoenix Suns 2026-27 season preview: Miles Bridges trade","https://www.fantasyalarm.com/articles/nba/nba-offseason/phoenix-suns-2026-27-season-preview/196389","Fantasy Alarm")
src("pl_phx2","Phoenix Suns cap table","https://www.spotrac.com/nba/phoenix-suns","Spotrac")
src("pl_por","Trail Blazers players under contract for 2026-27","https://fadeawayworld.net/?p=179644","Fadeaway World")
src("pl_por2","Portland Trail Blazers cap table","https://www.spotrac.com/nba/portland-trail-blazers/yearly","Spotrac")
src("pl_sac","2026-27 Kings roster, contracts, options and depth chart","https://www.si.com/nba/kings/onsi/2026-27-kings-roster-contracts-options-and-depth-chart","Sports Illustrated")
src("pl_sac2","Sacramento Kings 2026-27 season preview","https://www.fantasyalarm.com/articles/nba/nba-offseason/sacramento-kings-2026-27-season-preview/196392","Fantasy Alarm")
src("pl_sas","Spurs finalize 2026-27 opening night roster","https://news4sanantonio.com/news/instagram/spurs-finalize-2026-27-opening-night-roster-ahead-of-tuesdays-showdown-with-thunder-texas-frost-bank-center-fans-wemby-guards","News 4 San Antonio")
src("pl_sas2","Spurs' starting lineup still ranks among the NBA's best","https://heavy.com/sports/spurs-starting-lineup-best-2026-season/","Heavy")
src("pl_uta","Utah Jazz cap table","https://www.spotrac.com/nba/utah-jazz/yearly/_/sort/cap_total/view/roster","Spotrac")
src("pl_uta2","Jazz active roster 2026-27 (Bleacher Report)","https://bleacherreport.com/articles/25426179-jazzs-active-roster-draft-class-2026-27-salary-info-and-free-agents-after-nba-draft-results","Bleacher Report")
src("pl_was","2026 NBA Summer League roster: Wizards","https://www.nba.com/summer-league/2026/las-vegas/team/1610612764/wizards","NBA.com")
src("pl_tor","Toronto Raptors 2026-27 season preview","https://www.fantasyalarm.com/articles/nba/nba-offseason/toronto-raptors-2026-27-season-preview/196830","Fantasy Alarm")
# EuroLeague
src("pl_eh_index","EuroLeague rosters and transfers index 2026-2027","https://www.eurohoops.net/en/trademarks/1986338/euroleague-rosters-and-transfers-index-2026-2027/","Eurohoops")
src("pl_fcb","Justin Minaya out for ten days as Barcelona hosts Zalgiris","https://www.eurohoops.net/en/euroleague/2017895/justin-minaya-out-ten-days-barcelona-versus-zalgiris-euroleague/","Eurohoops")
src("pl_val","Valencia Basket men's team news (official)","https://www.valenciabasket.com/en/armoni-brooks-and-elias-valtonen-complete-their-signing-with-valencia-basket","Valencia Basket (official)")
src("pl_val2","Omari Moore will stay with Valencia Basket (official)","https://www.valenciabasket.com/en/omari-moore-will-stay-with-valencia-basket-for-another-season","Valencia Basket (official)")
src("pl_val3","Kameron Taylor extends his contract until 2028 (official)","https://www.valenciabasket.com/en/kameron-taylor-extends-his-contract-with-valencia-basket-until-2028","Valencia Basket (official)")
src("pl_val4","Gonzalo Corbalan joins Valencia Basket (official)","https://www.valenciabasket.com/en/gonzalo-corbalan-joins-valencia-basket","Valencia Basket (official)")
src("pl_val5","Valencia re-signs Lopez-Arostegui","https://www.euroleaguebasketball.net/euroleague/news/valencia-re-signs-lopez-arostegui-for-2-more-years","Euroleague Basketball")
src("pl_bkn_santos","Marcio Santos pens two-year contract with Baskonia","https://www.eurohoops.net/en/euroleague/2013613/marcio-santos-to-baskonia-euroleague/","Eurohoops")
src("pl_bkn_len","Alex Len pens a two-year contract to move to Baskonia","https://www.eurohoops.net/en/euroleague/2007842/alex-len-to-baskonia-euroleague/","Eurohoops")
src("pl_pao","Panathinaikos brings back Mantzoukas and Moraitis","https://www.eurohoops.net/en/euroleague/1995455/panathinaikos-brings-back-lefteris-mantzoukas-and-dimitris-moraitis/","Eurohoops")
src("pl_pao2","Badio locked in for Panathinaikos","https://www.eurohoops.net/en/euroleague/1987317/brancou-badio-to-panathinaikos-euroleague/","Eurohoops")
src("pl_pao3","EuroLeague Round 3 squad: Panathinaikos vs Maccabi (2 Oct 2026)","https://www.sportschau.de/live-und-ergebnisse/basketball/euroleague-basketball/ma12385652/panathinaikos_maccabi-tel-aviv/spiel-kader","Sportschau")
src("pl_oly","Olympiacos pens George Pappas to a one-year deal","https://www.eurohoops.net/en/euroleague/2013268/george-pappas-to-olympiacos-euroleague/","Eurohoops")
src("pl_oly2","Olympiacos welcome back Karagiannidis","https://www.eurobasket.com/Greece/news/1031527/Olympiacos-welcome-back-Karagiannidis","Eurobasket")
src("pl_oly3","Olympiacos is set to acquire Nikos Plotas","https://www.eurohoops.net/en/euroleague/2000170/nikos-plotas-to-olympiacos-euroleague/","Eurohoops")
src("pl_fen","Fenerbahce reportedly agree on deals with Forrest and Sargiunas","https://www.eurohoops.net/en/euroleague/1958732/fenerbahce-reportedly-agree-deals-with-forrest-and-sargiunas/","Eurohoops")
src("pl_bkn_out","Forrest, Nowell, Omoruyi, Radzevicius and Edwards will not remain in Baskonia","https://kirolakeitb.eus/en/basketball/teams/baskonia/2026/06/27/forrest-nowell-omoruyi-radzevicius-and-edwards-will-not-remain-in-baskonia/","EITB")
src("pl_efs","Anadolu Efes sign EuroCup's top scorer Daron Russell","https://www.anews.com.tr/world/2026/08/14/anadolu-efes-sign-eurocups-top-scorer-daron-russell/amp","A News")
src("pl_efs2","Efes officially locks up Jordan Loyd","https://www.eurohoops.net/en/euroleague/1981098/jordan-loyd-signs-contract-extension-efes-euroleague/","Eurohoops")
src("pl_efs3","Ercan Osmani extends deal at Efes to 2027","https://www.euroleaguebasketball.net/euroleague/news/ercan-osmani-extends-deal-at-efes-to-2027","Euroleague Basketball")
src("pl_efs4","Anadolu Efes brings in Santi Yusta","https://www.eurohoops.net/en/euroleague/1989265/anadolu-efes-brings-in-santi-yusta/","Eurohoops")
src("pl_el_inj8","EuroLeague injury report Round 8","https://www.eurohoops.net/en/euroleague/2027329/injury-report-round-8-papagiannis-walker-gtds-dotson-milutinov-out/","Eurohoops")
src("pl_mta","Maccabi Tel Aviv officially announced the addition of Yam Madar","https://www.eurohoops.net/en/euroleague/1990468/maccabi-tel-aviv-officially-announced-the-addition-of-yam-madar/","Eurohoops")
src("pl_mta2","Madar and Theis debut as Maccabi secures preseason victory","https://www.eurohoops.net/en/euroleague/2005723/yam-madar-daniel-theis-debut-maccabi/","Eurohoops")
src("pl_mta3","Shane Hunter (Maccabi announcement)","https://aws-prod-web9.rotowire.com/euro/player/shane-hunter-1481","RotoWire")
src("pl_fen_out","Fenerbahce reaches Larkin agreement (incl. Colson to Maccabi)","https://www.eurohoops.net/en/euroleague/1984433/shane-larkin-reaches-deal-with-fenerbahce-shavon-shields-braxton-key-marcus-bingham-trento-forrest-ignas-sargiunas-euroleague/","Eurohoops")
src("pl_hta","Hapoel Tel Aviv signs Eugene German","https://www.eurohoops.net/en/euroleague/1995735/hapoel-tel-aviv-signs-eugene-german/","Eurohoops")
src("pl_hta2","Amir Coffey signs with Hapoel Tel Aviv","https://www.eurohoops.net/en/euroleague/1989682/amir-coffey-signs-with-hapoel-tel-aviv/","Eurohoops")
src("pl_hta3","Satoransky joins Hapoel Tel Aviv on one-year deal","https://www.eurohoops.net/en/euroleague/1991254/satoransky-joins-hapoel-tel-aviv-on-one-year-deal/","Eurohoops")
src("pl_hta4","Hapoel Tel Aviv signs Max Heidegger","https://www.eurohoops.net/en/euroleague/2005115/hapoel-tel-aviv-signs-max-heidegger-to-a-one-season-contract/","Eurohoops")
src("pl_hta5","Hapoel guaranteed a deal for Tyler Ennis for 2026-27","https://www.eurohoops.net/en/euroleague/1956355/hapoel-guaranteed-a-deal-for-tyler-ennis-for-2026-27-season-despite-injury/","Eurohoops")
src("pl_hta6","Levi Randolph signs with Hapoel Tel Aviv","https://www.eurohoops.net/en/euroleague/1935788/levi-randolph-signs-with-hapoel-tel-aviv-euroleague","Eurohoops")
src("pl_hta7","Hapoel, Blakeney agree to contract extension","https://www.euroleaguebasketball.net/eurocup/news/hapoel-blakeney-agree-to-contract-extension","Euroleague Basketball")
src("pl_el_inj5","EuroLeague injury report Round 5","https://www.eurohoops.net/en/euroleague/2020670/euroleague-injury-report-round-5-rhoden-ginat-return/","Eurohoops")
src("pl_czv","Crvena zvezda tabs David Kramer","https://www.eurobasket.com/Austria/news/1010991/Crvena-zvezda-tabs-David-Kramer","Eurobasket")
src("pl_czv2","Crvena Zvezda sign Vojin Medarevic to a three-year deal","https://www.eurohoops.net/en/euroleague/1994798/crvena-zvezda-sign-vojin-medarevic-to-a-three-year-deal/","Eurohoops")
src("pl_czv3","Zvezda adds guard Miljenovic, brings back big man Plavsic","https://www.euroleaguebasketball.net/euroleague/news/zvezda-adds-guard-miljenovic-brings-back-big-man-plavsic","Euroleague Basketball")
src("pl_par","Nikola Tanaskovic returns to Partizan","https://www.eurohoops.net/en/euroleague/1994087/nikola-tanaskovic-to-partizan-euroleague/","Eurohoops")
src("pl_par2","Ethan Thompson to Partizan","https://www.eurohoops.net/en/euroleague/1999014/ethan-thompson-to-partizan-euroleague/","Eurohoops")
src("pl_par3","Tonye Jekiri officially signs new contract with Partizan","https://www.eurohoops.net/en/euroleague/1979922/tonye-jekiri-officially-signs-new-contract-with-partizan/","Eurohoops")
src("pl_bay","FC Bayern Basketball first practice 2026-27 (official)","https://fcbayern.com/basketball/en/news/2026-27/08/first-practice-26-27","FC Bayern Basketball (official)")
src("pl_vir","Virtus Bologna lands Marcus Carr on multi-year contract","https://www.eurohoops.net/en/euroleague/1988459/marcus-carr-to-virtus-bologna-euroleague/","Eurohoops")
src("pl_vir2","Dubai, Virtus Bologna, and Paris announce key roster moves","https://www.eurohoops.net/en/euroleague/1986379/dwayne-bacon-stays-dubai-davide-casarin-joins-virtus-bologna-terry-tarpey-joins-paris-euroleague/","Eurohoops")
src("pl_mil","Nicola Akele to Olimpia Milano","https://www.eurohoops.net/en/euroleague/1988418/nicola-akele-to-olimpia-milano-euroleague/amp/","Eurohoops")
src("pl_mil2","Milan sidelines Alec Peters for key game against Panathinaikos","https://www.eurohoops.net/en/euroleague/2026732/alec-peters-out-milan-at-panathinaikos-euroleague/","Eurohoops")
src("pl_asv","Tremont Waters to ASVEL","https://www.eurohoops.net/en/euroleague/2001094/tremont-waters-to-asvel-euroleague/amp/","Eurohoops")
src("pl_asv2","Joel Bolomboy pens a two-year contract to join ASVEL","https://www.eurohoops.net/en/euroleague/1998003/joel-bolomboy-to-asvel-euroleague-2/","Eurohoops")
src("pl_asv3","Nate Sestina inks a one-year deal with ASVEL","https://www.eurohoops.net/en/euroleague/1998241/nate-sestina-to-asvel-euroleague/","Eurohoops")
src("pl_asv4","ASVEL signs Both Gach for the 2026-27 season","https://www.eurohoops.net/en/euroleague/1987828/asvel-signs-both-gach-for-the-2026-27-season/amp/","Eurohoops")
src("pl_asv5","Yves Pons returns to ASVEL","https://www.eurohoops.net/en/euroleague/1988896/yves-pons-returns-to-asvel/","Eurohoops")
src("pl_asv6","David Lighty continues with ASVEL","https://eurohoops.net/en/euroleague/2000506/david-lighty-continues-with-asvel-euroleague","Eurohoops")
src("pl_prs","Tyson Etienne signs with Paris","https://www.eurohoops.net/en/euroleague/1991706/tyson-etienne-to-paris-euroleague/","Eurohoops")
src("pl_prs2","Leopold Cavaliere extends his contract (official)","https://parisbasketball.com/en/2026/07/leopold-cavaliere-extends-his-contract/","Paris Basketball (official)")
src("pl_el_inj4","Key players who will miss EuroLeague Round 4","https://www.eurohoops.net/en/euroleague/2017474/these-are-the-key-players-who-will-miss-euroleague-round-4/","Eurohoops")
src("pl_dub","Dubai Basketball secures Tornike Shengelia (official)","https://dubaibasketball.com/basketball/dubai-basketball-secures-tornike-shengelia-from-fc-barcelona-ahead-of-2026-27-season/","Dubai Basketball (official)")
src("pl_dub2","Dubai Basketball adds Mamadi Diakite (official)","https://dubaibasketball.com/basketball/dubai-basketball-adds-guinean-talent-mamadi-diakite-to-2026-27-roster/","Dubai Basketball (official)")
src("pl_dub3","Dubai picks up Davion Mintz","https://www.eurohoops.net/en/euroleague/1992262/davion-mintz-to-dubai-euroleague/","Eurohoops")
src("pl_dub4","Yannick Kraag (signed by Dubai, loaned to Joventut)","https://www.rotowire.com/euro/player/yannick-kraag-1603","RotoWire")
src("pl_bjk","Besiktas signs Korkmaz and retains four key players","https://www.eurohoops.net/en/euroleague/1987016/besiktas-retains-four-key-players-for-the-2026-27-season","Eurohoops")
src("pl_bjk2","Besiktas officially sign Jaylen Nowell","https://www.eurohoops.net/en/euroleague/1990628/besiktas-officially-sign-jaylen-nowell/","Eurohoops")
src("pl_bjk3","Besiktas reinforces roster with Metecan Birsen","https://www.eurohoops.net/en/euroleague/1987351/metecan-birsen-to-besiktas-euroleague-2/","Eurohoops")
src("pl_bjk4","Wilbekin signs with Besiktas","https://www.eurohoops.net/en/euroleague/1987368/scottie-wilbekin-to-besiktas-euroleague/","Eurohoops")
src("pl_bjk5","Besiktas formally signs Eugene Omoruyi","https://www.eurohoops.net/en/euroleague/1991340/eugene-omoruyi-to-besiktas-euroleague/","Eurohoops")

# ---- players: (club_ref, first, last, position, role, confidence, sources, note)
# position: PG/SG/SF/PF/C exact; G/F/GF/FC/CF group; None unknown.
P = []
def add(club, first, last, pos, role, conf, sources, note=""):
    P.append((club, first, last, pos, role, conf, sources, note))
B2 = ["pl_bos", "pl_bos2"]
for f,l,pos in [("Devin","Carter","G"),("Mike","Conley","G"),("Hugo","González","G"),("Payton","Pritchard","G"),("Baylor","Scheierman","G"),("Derrick","White","G"),
                ("Chris","Cenac Jr.","F"),("Paul","George","F"),("Ron","Harper Jr.","F"),("Sam","Hauser","F"),("Dillon","Mitchell","F"),("Jayson","Tatum","F"),("Jordan","Walsh","F"),
                ("Luka","Garza","C"),("Neemias","Queta","C"),("Mitchell","Robinson","C"),("Amari","Williams","C")]:
    add("nba:bos", f, l, pos, None, "cross_checked", B2, "Listed by at least two of Fox Sports, Basketball-Reference, RealGM, BeBasket.")
A=["pl_atl","pl_atl2"]
for f,l,pos in [("CJ","McCollum","G"),("Nickeil","Alexander-Walker","G"),("Dyson","Daniels","GF"),("Jalen","Johnson","F"),("Onyeka","Okongwu","C")]: add("nba:atl",f,l,pos,"starter","cross_checked",A)
A=["pl_bkn","pl_bkn2"]
for f,l,pos in [("Mikel","Brown Jr.","PG"),("Egor","Demin","G"),("Michael","Porter Jr.","F"),("Julius","Randle","F"),("Day'Ron","Sharpe","C")]: add("nba:bkn",f,l,pos,"starter","cross_checked",A)
A=["pl_cha","pl_cha2"]
for f,l,pos in [("Coby","White","PG"),("Kon","Knueppel","SG"),("Brandon","Miller","SF"),("Naz","Reid","PF"),("Moussa","Diabaté","C")]: add("nba:cha",f,l,pos,"starter","cross_checked",A)
add("nba:cha","Dennis","Schröder",None,None,"cross_checked",["pl_cha2","pl_cle"],"Arrived from Cleveland in a five-team trade (reported by both teams' coverage).")
A=["pl_chi","pl_chi2"]
for f,l,pos in [("Josh","Giddey","PG"),("Norman","Powell","SG"),("Matas","Buzelis","SF"),("Caleb","Wilson","PF"),("Nic","Claxton","C")]: add("nba:chi",f,l,pos,"starter","cross_checked",A+(["pl_mia"] if l=="Powell" else []))
A=["pl_cle","pl_cle2"]
for f,l,pos in [("James","Harden","PG"),("Donovan","Mitchell","SG"),("Peyton","Watson","SF"),("Evan","Mobley","PF"),("Jarrett","Allen","C")]: add("nba:cle",f,l,pos,"starter","cross_checked",A+(["pl_den"] if l=="Watson" else []))
A=["pl_dal","pl_dal2"]
add("nba:dal","Cooper","Flagg","SF","starter","cross_checked",A); add("nba:dal","Kyrie","Irving","PG","starter","cross_checked",A)
add("nba:dal","Zaccharie","Risacher",None,None,"cross_checked",A,"Acquired from Atlanta in a three-team trade (19 July 2026).")
A=["pl_den","pl_den2"]
for f,l,pos in [("Jamal","Murray","PG"),("Christian","Braun","G"),("Cam","Johnson","F"),("Aaron","Gordon","F"),("Nikola","Jokić","C")]: add("nba:den",f,l,pos,"starter","cross_checked",A)
add("nba:den","DeMar","DeRozan","GF","rotation","cross_checked",A+["pl_sac2"],"Signed veteran-minimum deal; reported waived by Sacramento.")
A=["pl_det","pl_det2"]
for f,l,pos in [("Cade","Cunningham","PG"),("Duncan","Robinson","SG"),("Ausar","Thompson","SF"),("John","Collins","PF"),("Jalen","Duren","C")]: add("nba:det",f,l,pos,"starter","cross_checked",A)
add("nba:det","Isaiah","Joe","G","rotation","cross_checked",["pl_det2","pl_okc"],"Moved from Oklahoma City (reported by both teams' coverage).")
A=["pl_gsw","pl_gsw2"]
for f,l,pos,r in [("Stephen","Curry","PG","starter"),("Brandin","Podziemski","SG","starter"),("Draymond","Green","PF","starter"),("Kristaps","Porziņģis","C","starter"),
                  ("Jimmy","Butler",None,"rotation"),("Moses","Moody",None,"rotation"),("Gui","Santos","SF","rotation"),("Yaxel","Lendeborg","SF","rotation")]: add("nba:gsw",f,l,pos,r,"cross_checked",A)
A=["pl_hou","pl_hou2"]
for f,l,pos in [("Fred","VanVleet","PG"),("Amen","Thompson","SG"),("Kevin","Durant","SF"),("Alperen","Şengün","C")]: add("nba:hou",f,l,pos,"starter","cross_checked",A)
add("nba:hou","Tari","Eason",None,"rotation","cross_checked",A,"Re-signed 9 July 2026.")
A=["pl_ind","pl_ind2"]
add("nba:ind","Ivica","Zubac","C",None,"cross_checked",A+["pl_lac"],"Traded from the Clippers (February).")
add("nba:ind","Jay","Huff","C",None,"cross_checked",A); add("nba:ind","Larry","Nance Jr.","C",None,"cross_checked",A)
A=["pl_lac","pl_lac2"]
add("nba:lac","Max","Strus","G",None,"cross_checked",A+["pl_cle"],"From Cleveland in the five-team trade (20 Aug 2026).")
add("nba:lac","Brandon","Ingram","GF",None,"cross_checked",A+["pl_tor"],"Traded from Toronto.")
add("nba:lac","Rui","Hachimura","F",None,"cross_checked",A)
add("nba:lac","Gradey","Dick",None,None,"cross_checked",A+["pl_tor"],"Traded from Toronto with Ingram.")
add("nba:lac","Johni","Broome",None,None,"cross_checked",A)
A=["pl_lal","pl_lal2"]
add("nba:lal","Luka","Dončić","PG","starter","cross_checked",A); add("nba:lal","Austin","Reaves","SG","starter","cross_checked",A); add("nba:lal","Quentin","Grimes","SG",None,"cross_checked",A)
A=["pl_mem","pl_mem2"]
add("nba:mem","Cameron","Boozer","PF",None,"cross_checked",A,"No. 3 pick in 2026."); add("nba:mem","Isaiah","Stewart","FC",None,"cross_checked",A+["pl_det2"],"From Detroit in a six-team trade.")
A=["pl_mia","pl_mia2","pl_nbapr"]
add("nba:mia","Giannis","Antetokounmpo","F","starter","cross_checked",A); add("nba:mia","Bam","Adebayo","CF","starter","cross_checked",A)
add("nba:mia","Andrew","Wiggins","GF",None,"cross_checked",A); add("nba:mia","Davion","Mitchell","PG","starter","cross_checked",A)
A=["pl_min","pl_min2"]
add("nba:min","Anthony","Edwards","SG","starter","cross_checked",A); add("nba:min","Jonathan","Kuminga","F","starter","cross_checked",A)
add("nba:min","Donte","DiVincenzo",None,"reserve","cross_checked",A,"Torn Achilles; expected to miss the season.")
add("nba:nop","Zion","Williamson","PF","starter","cross_checked",["pl_nop","pl_nop2"])
A=["pl_okc","pl_okc2"]
add("nba:okc","Shai","Gilgeous-Alexander","G","starter","cross_checked",A); add("nba:okc","Jalen","Williams","G","starter","cross_checked",A); add("nba:okc","Chet","Holmgren","C","starter","cross_checked",A)
A=["pl_orl","pl_orl2"]
add("nba:orl","Paolo","Banchero","PF","starter","cross_checked",A); add("nba:orl","Franz","Wagner","F","starter","cross_checked",A)
add("nba:orl","Nikola","Vučević",None,None,"cross_checked",A,"Signed 1 July 2026 (one-year deal).")
add("nba:phi","Jaylen","Brown",None,None,"cross_checked",["pl_phi","pl_wiki_brown"],"Traded from Boston (July 2026).")
add("nba:phi","LeBron","James",None,None,"cross_checked",["pl_phi2","pl_lal2"],"Left the Lakers for Philadelphia.")
A=["pl_phx","pl_phx2"]
add("nba:phx","Devin","Booker","SG","starter","cross_checked",A); add("nba:phx","Miles","Bridges","SF","starter","cross_checked",A+["pl_cha2"],"Traded from Charlotte.")
add("nba:por","Jrue","Holiday","PG",None,"cross_checked",["pl_por","pl_por2"])
A=["pl_sac","pl_sac2"]
add("nba:sac","Domantas","Sabonis","F",None,"cross_checked",A); add("nba:sac","Zach","LaVine",None,None,"cross_checked",A)
add("nba:sas","Victor","Wembanyama","C","starter","cross_checked",["pl_sas","pl_sas2"])
add("nba:uta","Lauri","Markkanen","PF",None,"cross_checked",["pl_uta","pl_uta2"])
add("nba:was","AJ","Dybantsa","GF",None,"official",["pl_was"],"2026 No. 1 pick (NBA.com Summer League roster).")
# EuroLeague
add("el:fcb","Justin","Minaya",None,None,"official",["pl_fcb"],"Club announced an adductor injury (Oct 2026).")
for f,l,pos,s_ in [("Armoni","Brooks","SG",["pl_val"]),("Elias","Valtonen","F",["pl_val"]),("Gonzalo","Corbalán","SG",["pl_val4"]),("Omari","Moore",None,["pl_val2"]),("Xabi","López-Arostegui","G",["pl_val5"]),("Kameron","Taylor",None,["pl_val3"])]:
    add("el:val",f,l,pos,None,"official",s_, "On loan from ASVEL." if l=="Brooks" else ("Non-guaranteed deal." if l=="Valtonen" else ""))
add("el:bkn","Marcio","Santos","FC",None,"official",["pl_bkn_santos"]); add("el:bkn","Alex","Len","C",None,"official",["pl_bkn_len"])
add("el:pao","Lefteris","Mantzoukas",None,None,"official",["pl_pao"]); add("el:pao","Dimitris","Moraitis",None,None,"official",["pl_pao"])
add("el:pao","Brancou","Badio",None,None,"official",["pl_pao2"]); add("el:pao","Moustapha","Fall","C",None,"official",["pl_pao3"],"In the Round 3 matchday squad."); add("el:pao","Mathias","Lessort","C",None,"official",["pl_pao3"],"In the Round 3 matchday squad.")
A=["pl_eh_index","pl_oly2"]
for f,l,pos in [("Cory","Joseph","G"),("Codi","Miller-McIntyre","G"),("Jean","Montero","G"),("Omiros","Netzipoglou","G")]: add("el:oly",f,l,pos,None,"cross_checked",A,"Listed in both the Eurohoops and Eurobasket rosters.")
add("el:oly","George","Pappas",None,None,"official",["pl_oly"]); add("el:oly","Nikos","Plotas","G",None,"cross_checked",["pl_oly3","pl_eh_index"])
add("el:oly","Antonis","Karagiannidis",None,None,"cross_checked",["pl_oly2","pl_eh_index"]); add("el:oly","Mbaye","Ndiaye",None,None,"cross_checked",["pl_eh_index","pl_oly"])
add("el:fen","Trent","Forrest",None,None,"cross_checked",["pl_fen","pl_bkn_out"],"Left Baskonia for Fenerbahçe.")
for f,l,pos,s_ in [("Daron","Russell","G",["pl_efs"]),("Jordan","Loyd",None,["pl_efs2"]),("Isaia","Cordinier",None,["pl_efs2"]),("Ercan","Osmani",None,["pl_efs3"]),("Georgios","Papagiannis","C",["pl_el_inj8"]),("Santi","Yusta","F",["pl_efs4"])]:
    add("el:efs",f,l,pos,None,"official",s_)
add("el:mta","Yam","Madar","PG",None,"official",["pl_mta"],"Three-year deal; from Hapoel Tel Aviv.")
add("el:mta","Daniel","Theis",None,None,"cross_checked",["pl_mta2","pl_eh_index"]); add("el:mta","Roman","Sorkin",None,None,"cross_checked",["pl_mta2","pl_eh_index"])
add("el:mta","Shane","Hunter",None,None,"official",["pl_mta3"]); add("el:mta","Bonzie","Colson",None,None,"official",["pl_fen_out"],"Two-year contract (from Fenerbahçe).")
for f,l,pos,s_ in [("Eugene","German","G",["pl_hta"]),("Amir","Coffey","F",["pl_hta2"]),("Tomáš","Satoranský",None,["pl_hta3"]),("Max","Heidegger","G",["pl_hta4"]),("Tyler","Ennis",None,["pl_hta5"]),
                   ("Levi","Randolph","GF",["pl_hta6"]),("Antonio","Blakeney",None,["pl_hta7"]),("Tomer","Ginat",None,["pl_el_inj5"]),("Bar","Timor",None,["pl_el_inj5"])]:
    add("el:hta",f,l,pos,None,"official",s_)
add("el:czv","David","Kramer","GF",None,"official",["pl_czv"]); add("el:czv","Vojin","Medarević","C",None,"official",["pl_czv2"])
add("el:czv","Stefan","Miljenović","G",None,"official",["pl_czv3"]); add("el:czv","Uroš","Plavšić","C",None,"official",["pl_czv3"])
add("el:par","Nikola","Tanasković","F",None,"official",["pl_par"]); add("el:par","Ethan","Thompson",None,None,"official",["pl_par2"])
add("el:par","Luca","Vildoza","G",None,"official",["pl_par2"]); add("el:par","Tonye","Jekiri","C",None,"official",["pl_par3"])
add("el:bay","Duane","Washington Jr.",None,None,"official",["pl_bay"]); add("el:bay","Tobias","Jensen",None,None,"official",["pl_bay"])
add("el:vir","Marcus","Carr","G",None,"official",["pl_vir"]); add("el:vir","Davide","Casarin",None,None,"cross_checked",["pl_vir","pl_vir2"])
add("el:mil","Nicola","Akele","F",None,"official",["pl_mil"]); add("el:mil","Alec","Peters",None,None,"official",["pl_mil2"])
for f,l,pos,s_ in [("Tremont","Waters","PG",["pl_asv"]),("Joel","Bolomboy","F",["pl_asv2"]),("Nate","Sestina","FC",["pl_asv3"]),("Both","Gach","F",["pl_asv4"]),("Yves","Pons",None,["pl_asv5"]),("David","Lighty",None,["pl_asv6"])]:
    add("el:asv",f,l,pos,None,"official",s_)
add("el:prs","Tyson","Etienne","G",None,"official",["pl_prs"]); add("el:prs","Leopold","Cavaliere",None,None,"official",["pl_prs2"])
add("el:prs","Alize","Johnson",None,None,"official",["pl_el_inj4"]); add("el:prs","Maozinha","Pereira",None,None,"official",["pl_el_inj4"]); add("el:prs","Terry","Tarpey",None,None,"official",["pl_vir2"])
for f,l,pos,s_ in [("Tornike","Shengelia","F",["pl_dub"]),("Mamadi","Diakite","FC",["pl_dub2"]),("Davion","Mintz","G",["pl_dub3"]),("Dwayne","Bacon",None,["pl_vir2"])]:
    add("el:dub",f,l,pos,None,"official",s_)
add("acb:joventut","Yannick","Kraag",None,None,"official",["pl_dub4"],"Under contract with Dubai, loaned to Joventut for 2026-27.")
for f,l,pos,s_ in [("Berk","Uğurlu",None,["pl_bjk"]),("Ante","Žižić","C",["pl_bjk"]),("Anthony","Brown",None,["pl_bjk"]),("Devon","Dotson",None,["pl_bjk","pl_el_inj8"]),("Furkan","Korkmaz",None,["pl_bjk"]),
                   ("Metecan","Birsen","F",["pl_bjk3"]),("Scottie","Wilbekin",None,["pl_bjk4"]),("Eugene","Omoruyi",None,["pl_bjk5","pl_bkn_out"]),("Jaylen","Nowell","G",["pl_bjk2"]),
                   ("DaQuan","Jeffries",None,["pl_bjk2"]),("Mady","Sissoko",None,["pl_bjk2"])]:
    add("el:bjk",f,l,pos,None,"official",s_)

# ---- conflicts (excluded) and single-source candidates (not imported) ----
conflicts = [
 dict(player="Walker Kessler", clubs=["nba:lal","nba:uta"], sources=["pl_lal2","pl_uta"], resolution="Excluded: Lakers coverage reports him signed, Utah coverage describes him as Utah's defensive anchor."),
 dict(player="Jerami Grant", clubs=["nba:mem","nba:por"], sources=["pl_mem2","pl_por"], resolution="Excluded: reported traded to Memphis for Ja Morant; Portland contract list still shows him."),
 dict(player="Jaime Jaquez Jr.", clubs=["nba:mia","nba:mil"], sources=["pl_mia2"], resolution="Excluded: Miami lists him, Milwaukee coverage reports him in the Giannis trade (single source)."),
 dict(player="Kel'el Ware", clubs=["nba:mia","nba:mil"], sources=["pl_mia2"], resolution="Excluded: same conflict as Jaquez."),
 dict(player="Ryan Conwell", clubs=["nba:mia","nba:okc"], sources=["pl_mia2","pl_okc"], resolution="Excluded: Miami depth chart vs Oklahoma City 2026 draft pick (37th)."),
 dict(player="Felix Okpara", clubs=["nba:orl","nba:was"], sources=["pl_orl","pl_was"], resolution="Excluded: Orlando 46th pick vs Washington depth chart."),
 dict(player="Klay Thompson", clubs=["nba:dal","nba:mia"], sources=["pl_dal","pl_mia2"], resolution="Excluded: waived by Dallas; Miami only rumoured."),
 dict(player="Thomas Walkup", clubs=["el:oly"], sources=["pl_oly"], resolution="Excluded: listed on a roster but the coach said he will not be with the team."),
 dict(player="Markus Howard", clubs=["el:bkn"], sources=["pl_bkn_santos"], resolution="Excluded: later reported leaving Baskonia for Zenit."),
]
candidates_note = "Named by a single non-official source in the 2026-11-03 research; not imported until confirmed."
candidates = {
 "nba:atl":["Luguentz Dort"], "nba:bkn":["Nolan Traore","Joshua Jefferson","Tyler Bilodeau"], "nba:cha":["Hannes Steinbach","Rob Dillingham"],
 "nba:chi":["Dailyn Swain","Buddy Hield"], "nba:cle":["Sam Merrill","Mario Hezonja","Thomas Bryant"], "nba:dal":["P.J. Washington","Morez Johnson","Dereck Lively II","Marcus Sasser","Sergio De Larrea","Max Christie"],
 "nba:den":["Tyus Jones","Julian Strawther","Spencer Jones","Trevon Brazile"], "nba:det":["Gary Harris","Taurean Prince"], "nba:gsw":["De'Anthony Melton"],
 "nba:hou":["Jabari Smith Jr.","Jae'Sean Tate","Steven Adams","Clint Capela"],
 "nba:ind":["Tyrese Haliburton","T.J. McConnell","Kam Jones","Andrew Nembhard","Ben Sheppard","Quenton Jackson","Aaron Nesmith","Jarace Walker","Johnny Furphy","Pascal Siakam","Obi Toppin","Micah Potter","Kelly Oubre Jr.","Braden Smith"],
 "nba:lac":["Darius Garland","Bradley Beal","Cam Christie","Kris Dunn","Keaton Wagler","Baba Miller","Henri Veesaar"],
 "nba:lal":["Sandro Mamukelashvili","Collin Sexton","Kevon Looney","Matisse Thybulle","Ziaire Williams","Bronny James"],
 "nba:mem":["Zach Edey","Cedric Coward","Ty Jerome","Kris Murray","Scotty Pippen Jr.","Jaylen Wells","GG Jackson","Taylor Hendricks"],
 "nba:mia":["Pelle Larsson","Nikola Jović","Tim Hardaway Jr.","Simone Fontecchio","Bobby Portis","Dru Smith","Keshad Johnson"],
 "nba:mil":["Tyler Herro","Kasparas Jakučionis","Gary Trent Jr.","Ousmane Dieng","Brayden Burries","Nate Ament"],
 "nba:min":["Jaden McDaniels","Rudy Gobert","Ayo Dosunmu","Naz Reid (conflict: Charlotte)","Bones Hyland","Jaylen Clark","Terrence Shannon Jr.","LaMelo Ball"],
 "nba:nop":["Jordan Poole","Trey Murphy III","Bennedict Mathurin"], "nba:nyk":["Karl-Anthony Towns","OG Anunoby","Andre Drummond","James Wiseman"],
 "nba:okc":["Cason Wallace","Ajay Mitchell","Alex Caruso","Aday Mara","Ebuka Okorie"], "nba:orl":["Desmond Bane","Jevon Carter"],
 "nba:phi":["Joel Embiid","Tyrese Maxey","Anfernee Simons","VJ Edgecombe"], "nba:phx":["Jalen Green","Dillon Brooks","Khaman Maluach","Collin Gillespie","Luke Kennard"],
 "nba:por":["Shaedon Sharpe","Toumani Camara","Deni Avdija","Damian Lillard","Ja Morant"], "nba:sac":["Malik Monk","Darius Acuff Jr.","Precious Achiuwa","Nique Clifford"],
 "nba:sas":["Stephon Castle","Dylan Harper","De'Aaron Fox","Devin Vassell","Jordan McLaughlin"], "nba:tor":["Scottie Barnes","Allen Graves"],
 "nba:uta":["Jaren Jackson Jr.","Keyonte George","Jusuf Nurkić"], "nba:was":["Alex Sarr","Deandre Ayton","Anthony Davis","Trae Young"],
 "el:rma":["Jaime Pradilla","Timothé Luwawu-Cabarrot (pending buyout)"], "el:bkn":["Damion Baugh","Chris Duarte","Kenneth Faried","Rodions Kurucs","Tadas Sedekerskis","Matteo Spagnolo"],
 "el:fen":["Shane Larkin","Ignas Sargiunas","Nicolò Melli","Chris Silva"], "el:efs":["Dario Šarić","Kai Jones"], "el:oly":["Donta Hall","Tyrique Jones","Tyson Ward","Tyler Dorsey"],
 "el:par":["Carlik Jones","Joffrey Lauvergne","Vanja Marinković","Antonio Reeves"], "el:vir":["Daniel Hackett","Mouhamet Diouf","Kevin Kokila"], "el:mil":["R.J. Cole"],
 "el:dub":["Mfiondu Kabengele","Klemen Prepelič"], "el:zal":["Ąžuolas Tubelis","Dominykas Daubaris"], "el:czv":["Chris Jones"], "el:prs":["Daulton Hommes","Frank Ntilikina"],
}

def slug(s): return re.sub(r"[^a-z0-9]+","-",unicodedata.normalize("NFD",s).encode("ascii","ignore").decode().lower()).strip("-")
GROUP = {"G":"SG","F":"SF","GF":"SG","FC":"PF","CF":"C"}
players, seen = [], set()
for club, first, last, pos, role, conf, sources, note in P:
    ref = "player:" + slug(first + " " + last)
    assert ref not in seen, ref
    seen.add(ref)
    if pos in ("PG","SG","SF","PF","C"): position, basis = pos, "reported"
    elif pos in GROUP: position, basis = GROUP[pos], "group"
    else: position, basis = "SF", "unknown"
    players.append(dict(ref=ref, firstName=first, lastName=last, nationality=None, birthDate=None, heightCm=None, weightKg=None,
        position=position, secondaryPosition=None, positionBasis=basis, club=club, jersey=None, role=role, confidence=conf, season=2026,
        status="reported", sources=sources, stats=None, contract=None,
        notes=(note + (" Position group reported: %s." % pos if basis == "group" else " Position not reported; simulation slot is a placeholder." if basis == "unknown" else "")).strip()))
ids = {s["id"] for s in S}
for p in players:
    for s in p["sources"]: assert s in ids, s
json.dump(players, open(out + "/players.json", "w"), indent=1, ensure_ascii=False)
json.dump(dict(note=candidates_note, candidates=candidates, conflicts=conflicts), open(out + "/player-research.json", "w"), indent=1, ensure_ascii=False)
# merge sources into sources.json
base = json.load(open(out + "/sources.json"))
known = {s["id"] for s in base}
base += [s for s in S if s["id"] not in known]
json.dump(base, open(out + "/sources.json", "w"), indent=1, ensure_ascii=False)
print(len(players), "players;", sum(len(v) for v in candidates.values()), "candidates;", len(conflicts), "conflicts;", len(S), "player sources")
