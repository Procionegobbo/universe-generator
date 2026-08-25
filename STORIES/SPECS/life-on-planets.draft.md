# Life on Planets

This feature add to the generator the possibility to generate life of some planets.
Every planet of the right type and in the goldilock zone have a possibility to have life on it. 
Mathematical formulas about the possibility and complexity of life are in the `docs/exoplanet-habitability-model.md`
document.

## UI
The lists of systems and planets should have a filter to select which have life.
The planet details should show the presence and complexity of life.

## Names of planets with life
When a planet with life is generated it need a proper name.
It can be extracted from this list (the source column is only for reference, only the name will be used):

```csv
name,source
Arrakis,Dune
Caladan,Dune
Giedi Prime,Dune
Kaitain,Dune
Salusa Secundus,Dune
Ix,Dune
Tleilax,Dune
Chapterhouse,Dune
Wallach IX,Dune
Gammu,Dune
Rakis,Dune
Trantor,Asimov - Foundation
Terminus,Asimov - Foundation
Anacreon,Asimov - Foundation
Gaia,Asimov - Foundation
Solaria,Asimov - Foundation
Aurora,Asimov - Foundation
Helicon,Asimov - Foundation
Cyrgus,Asimov - Foundation
Kalgan,Asimov - Foundation
Comporellon,Asimov - Foundation
Sayshell,Asimov - Foundation
Smyrno,Asimov - Foundation
Korell,Asimov - Foundation
Gethen,Le Guin - Ekumen
Anarres,Le Guin - Ekumen
Urras,Le Guin - Ekumen
Hain,Le Guin - Ekumen
Werel,Le Guin - Ekumen
O,Le Guin - Ekumen
Ollul,Le Guin - Ekumen
Vavatch,Banks - Culture
Chelgrian Home,Banks - Culture
Prasadam,Banks - Culture
Ischloear,Banks - Culture
Phage,Banks - Culture
Ringworld,Niven
Kzin,Niven
Jinx,Niven
Plateau,Niven
We Made It,Niven
Down,Niven
Home,Niven
Tines World,Vinge
Relay,Vinge
Straumli Realm,Vinge
Riverworld,Farmer
Rama,Clarke
Europa,Clarke
Discovery,Clarke
Lagrange Point,Clarke
Solaris,Lem
Eden,Lem
Fomalhaut III,Lem
Marte,Wells - War of the Worlds
Barsoom,Burroughs
Jasoom,Burroughs
Amtor,Burroughs
Poloda,Burroughs
Va-nah,Burroughs
Tatooine,Star Wars
Coruscant,Star Wars
Naboo,Star Wars
Alderaan,Star Wars
Hoth,Star Wars
Endor,Star Wars
Dagobah,Star Wars
Kamino,Star Wars
Mustafar,Star Wars
Kashyyyk,Star Wars
Corellia,Star Wars
Ryloth,Star Wars
Geonosis,Star Wars
Jakku,Star Wars
Mandalore,Star Wars
Bespin,Star Wars
Yavin IV,Star Wars
Bothawui,Star Wars
Chandrila,Star Wars
Dathomir,Star Wars
Felucia,Star Wars
Hosnian Prime,Star Wars
Jedha,Star Wars
Lothal,Star Wars
Malastare,Star Wars
Mygeeto,Star Wars
Scarif,Star Wars
Utapau,Star Wars
Zeffo,Star Wars
Vulcano,Star Trek
Qo'noS,Star Trek
Romulus,Star Trek
Betazed,Star Trek
Bajor,Star Trek
Cardassia,Star Trek
Risa,Star Trek
Ferenginar,Star Trek
Deneva,Star Trek
Talos IV,Star Trek
Rura Penthe,Star Trek
Nimbus III,Star Trek
Andoria,Star Trek
Tellar,Star Trek
Terra,Warhammer 40000
Cadia,Warhammer 40000
Macragge,Warhammer 40000
Fenris,Warhammer 40000
Baal,Warhammer 40000
Necromunda,Warhammer 40000
Armageddon,Warhammer 40000
Commorragh,Warhammer 40000
Prospero,Warhammer 40000
Nocturne,Warhammer 40000
Medusa,Warhammer 40000
Chogoris,Warhammer 40000
Vigilus,Warhammer 40000
Asteroide B-612,The Little Prince
Camazotz,L'Engle - A Wrinkle in Time
Uriel,L'Engle - A Wrinkle in Time
Ixchel,L'Engle - A Wrinkle in Time
Panem,Hunger Games
Palaven,Mass Effect
Tuchanka,Mass Effect
Thessia,Mass Effect
Rannoch,Mass Effect
Sur'Kesh,Mass Effect
Illium,Mass Effect
Noveria,Mass Effect
Feros,Mass Effect
Virmire,Mass Effect
Eden Prime,Mass Effect
Khar'shan,Mass Effect
Sol,Elite Dangerous
Alioth,Elite Dangerous
Achenar,Elite Dangerous
Regina,Traveller RPG
Vland,Traveller RPG
Capital,Traveller RPG
Terra 2,Traveller RPG
Yggdrasil,Norse mythology
Asgard,Norse mythology
Midgard,Norse mythology
Jotunheim,Norse mythology
Alfheim,Norse mythology
Vanaheim,Norse mythology
Niflheim,Norse mythology
Muspelheim,Norse mythology
Svartalfheim,Norse mythology
Helheim,Norse mythology
Olimpo,Greek mythology
Elysium,Greek mythology
Ade,Greek mythology
Tartaro,Greek mythology
Mercurio,Real astronomy
Venere,Real astronomy
Terra,Real astronomy
Marte,Real astronomy
Giove,Real astronomy
Saturno,Real astronomy
Urano,Real astronomy
Nettuno,Real astronomy
Plutone,Real astronomy
Cerere,Real astronomy
Eris,Real astronomy
Makemake,Real astronomy
Haumea,Real astronomy
Titano,Real astronomy - moon
Europa,Real astronomy - moon
Ganimede,Real astronomy - moon
Callisto,Real astronomy - moon
Io,Real astronomy - moon
Encelado,Real astronomy - moon
Tritone,Real astronomy - moon
Miranda,Real astronomy - moon
Ariel,Real astronomy - moon
Umbriel,Real astronomy - moon
Caronte,Real astronomy - moon
Kepler-186f,Real astronomy - exoplanet
Kepler-452b,Real astronomy - exoplanet
TRAPPIST-1e,Real astronomy - exoplanet
Proxima Centauri b,Real astronomy - exoplanet
Gliese 581g,Real astronomy - exoplanet
HD 209458 b,Real astronomy - exoplanet
55 Cancri e,Real astronomy - exoplanet
Krypton,DC Comics
Oa,DC Comics
Apokolips,DC Comics
New Genesis,DC Comics
Thanagar,DC Comics
Rann,DC Comics
Xandar,Marvel Comics
Titan,Marvel Comics
Zenn-La,Marvel Comics
Sakaar,Marvel Comics
Knowhere,Marvel Comics
Ego,Marvel Comics
Spartax,Marvel Comics
Hala,Marvel Comics
Battle World,Marvel Comics
Cybertron,Transformers
Melmac,ALF
Vulcan,Doctor Who
Gallifrey,Doctor Who
Skaro,Doctor Who
Mondas,Doctor Who
Telos,Doctor Who
Trenzalore,Doctor Who
Karn,Doctor Who
Magrathea,Hitchhiker's Guide to the Galaxy
Vogsphere,Hitchhiker's Guide to the Galaxy
Krikkit,Hitchhiker's Guide to the Galaxy
Betelgeuse Seven,Hitchhiker's Guide to the Galaxy
Bethselamin,Hitchhiker's Guide to the Galaxy
Ursa Minor Beta,Hitchhiker's Guide to the Galaxy
Traal,Hitchhiker's Guide to the Galaxy
Squornshellous Zeta,Hitchhiker's Guide to the Galaxy
Pandora,Avatar
Arrakis II,Dune fan-fiction
LV-426,Alien
LV-223,Prometheus
Fiorina 161,Alien 3
Miranda,Serenity/Firefly
Osiris,Firefly
Ariel,Firefly
Persefone,Firefly
Sihnon,Firefly
Londinium,Firefly
Solace,Firefly
Aiur,StarCraft
Char,StarCraft
Korhal,StarCraft
Shakuras,StarCraft
Tarsonis,StarCraft
Zerus,StarCraft
Ehm,No Man's Sky
Eos,Mythology
Selene,Mythology
Chthonia,Generic sci-fi
Cybele,Generic sci-fi
Draconis Prime,Generic sci-fi
Vantablack IX,Generic sci-fi
Sarn,Generic sci-fi
Voss,Star Wars - Old Republic
Rakata Prime,Star Wars - Old Republic
Manaan,Star Wars - Old Republic
Korriban,Star Wars - Old Republic
Nal Hutta,Star Wars - Old Republic
Ossus,Star Wars - Old Republic
Zonama Sekot,Star Wars - New Jedi Order
Csilla,Star Wars
Myrkr,Star Wars
Wayland,Star Wars
Elom,Warhammer Fantasy/Sci-fi hybrid
Slaanesh Realm,Warhammer 40000
Khorne's Realm,Warhammer 40000
Golgotha,Generic sci-fi
Erebus IX,Generic sci-fi
Nyx Prime,Generic sci-fi
Helios Minor,Generic sci-fi
Vesper,Generic sci-fi
Thalassa,Generic sci-fi
Icarus Station,Generic sci-fi
Charon's Reach,Generic sci-fi
Obsidian Reach,Generic sci-fi
Meridian,Generic sci-fi
Xenith,Generic sci-fi
Verdant Prime,Generic sci-fi
Ashfall,Generic sci-fi
Driftwake,Generic sci-fi
Halcyon,The Outer Worlds
Terra 2,The Outer Worlds
Monarch,The Outer Worlds
Byzantium,The Outer Worlds
Scylla,The Outer Worlds
Gorgon,The Outer Worlds
Groundbreaker,The Outer Worlds
Citadel Space,Mass Effect
Omega,Mass Effect
Ilos,Mass Effect
Aratoht,Mass Effect
Klendagon,Mass Effect
Shanxi,Mass Effect
Elysium,Mass Effect
Terra Nova,Mass Effect
Arrae,Mass Effect
Deimos,Real astronomy - moon
Fobos,Real astronomy - moon
Iperione,Real astronomy - moon
Giapeto,Real astronomy - moon
Rea,Real astronomy - moon
Teti,Real astronomy - moon
Dione,Real astronomy - moon
Mimas,Real astronomy - moon
Nettuno,Real astronomy
Vulcan,Historical astronomy
Theia,Theoretical astronomy
Nibiru,Folklore/pseudoscience
```