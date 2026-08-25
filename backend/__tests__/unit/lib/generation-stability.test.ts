import { StellarGenerator } from '../../../src/lib/example_star_generator';

/**
 * Golden-fixture regression guard for the system/star naming feature.
 *
 * The literal values below were captured by running `generateSector` against the
 * generator as it stood BEFORE any naming code was wired in (blob
 * 4b9f0df53d2eacc99d01ac3dc1d04a37f30c5d36, identical to HEAD at the time).
 * They therefore describe the pre-naming behaviour, and prove that drawing names
 * from the separate `namePrng` stream leaves every pre-existing field untouched.
 *
 * Names are deliberately excluded from these comparisons — they are new output,
 * and are covered by stellar-generator.test.ts.
 *
 * If a change to the generation algorithm ever makes this file fail on purpose,
 * the fixture must be re-captured deliberately and the change called out as a
 * break in seed compatibility.
 */

interface GoldenSystem {
    systemId: number;
    xPos: number;
    yPos: number;
    zPos: number;
}

interface GoldenStar {
    starId: number;
    systemId: number;
    spectralClass: string;
    subclass: number | undefined;
}

interface GoldenPlanet {
    starId: number;
    orbitalNumber: number;
    planetType: string;
    diameter: number;
    moonCount: number;
    semiMajorAxis: number;
    temperature: number;
    habitableZone: boolean;
}

interface GoldenSector {
    systems: GoldenSystem[];
    stars: GoldenStar[];
    planets: GoldenPlanet[];
}

const GOLDEN: Record<string, { systemCount: number; sectorVolume: number; sector: GoldenSector }> = {
    'deterministic-seed': {
        systemCount: 5,
        sectorVolume: 1000,
        sector: {
            systems: [
                { systemId: 1, xPos: 1.0468952261969309, yPos: 8.321684587544958, zPos: 8.349033418079037 },
                { systemId: 2, xPos: 4.11938376896272, yPos: 3.2163286628229733, zPos: 8.67957100388839 },
                { systemId: 3, xPos: 0.3463812972651075, yPos: 8.019711753486828, zPos: 7.800953663405618 },
                { systemId: 4, xPos: 2.7198462121433047, yPos: 5.187323684493277, zPos: 5.329778315992137 },
                { systemId: 5, xPos: 5.998194095340608, yPos: 7.090975249763755, zPos: 2.9294530996736956 }
            ],
            stars: [
                { starId: 1, systemId: 1, spectralClass: 'M', subclass: 3 },
                { starId: 2, systemId: 1, spectralClass: 'K', subclass: 10 },
                { starId: 3, systemId: 2, spectralClass: 'M', subclass: 8 },
                { starId: 4, systemId: 3, spectralClass: 'M', subclass: 8 },
                { starId: 5, systemId: 3, spectralClass: 'M', subclass: 9 },
                { starId: 6, systemId: 4, spectralClass: 'M', subclass: 4 },
                { starId: 7, systemId: 4, spectralClass: 'M', subclass: 4 },
                { starId: 8, systemId: 5, spectralClass: 'M', subclass: 10 },
                { starId: 9, systemId: 5, spectralClass: 'M', subclass: 1 },
                { starId: 10, systemId: 5, spectralClass: 'M', subclass: 1 }
            ],
            planets: [
                { starId: 2, orbitalNumber: 1, planetType: 'S', diameter: 26000, moonCount: 0, semiMajorAxis: 0.2723310033918419, temperature: 427.93071873973093, habitableZone: false },
                { starId: 2, orbitalNumber: 2, planetType: 'M', diameter: 6000, moonCount: 1, semiMajorAxis: 0.42502165794877755, temperature: 430.6612483311433, habitableZone: false },
                { starId: 2, orbitalNumber: 3, planetType: 'E', diameter: 11000, moonCount: 0, semiMajorAxis: 0.7053152980836668, temperature: 274.0521793763626, habitableZone: true },
                { starId: 2, orbitalNumber: 4, planetType: 'S', diameter: 18000, moonCount: 0, semiMajorAxis: 1.1260786171018102, temperature: 230.7736365091835, habitableZone: false },
                { starId: 2, orbitalNumber: 5, planetType: 'U', diameter: 63000, moonCount: 9, semiMajorAxis: 1.5640149233442247, temperature: 161.87592676874337, habitableZone: false },
                { starId: 2, orbitalNumber: 6, planetType: 'U', diameter: 105000, moonCount: 6, semiMajorAxis: 3.2117407144115266, temperature: 112.96202668282, habitableZone: false },
                { starId: 2, orbitalNumber: 7, planetType: 'G', diameter: 150000, moonCount: 5, semiMajorAxis: 6.70553261981169, temperature: 78.17827336042293, habitableZone: false },
                { starId: 3, orbitalNumber: 1, planetType: 'W', diameter: 1700, moonCount: 0, semiMajorAxis: 0.06844249933367642, temperature: 418.7001211532103, habitableZone: false },
                { starId: 3, orbitalNumber: 2, planetType: 'R', diameter: 10000, moonCount: 0, semiMajorAxis: 0.1274939050530314, temperature: 342.601339002403, habitableZone: false },
                { starId: 3, orbitalNumber: 3, planetType: 'W', diameter: 2400, moonCount: 0, semiMajorAxis: 0.18656067419384645, temperature: 253.60392190730883, habitableZone: true },
                { starId: 3, orbitalNumber: 4, planetType: 'F', diameter: 5000, moonCount: 0, semiMajorAxis: 0.2841917731762676, temperature: 227.39613596217222, habitableZone: true },
                { starId: 4, orbitalNumber: 1, planetType: 'W', diameter: 700, moonCount: 0, semiMajorAxis: 0.08044904712638111, temperature: 386.19403763316353, habitableZone: false },
                { starId: 5, orbitalNumber: 1, planetType: 'C', diameter: 8000, moonCount: 0, semiMajorAxis: 0.09191865010990302, temperature: 414.1677757591495, habitableZone: false },
                { starId: 5, orbitalNumber: 2, planetType: 'U', diameter: 77000, moonCount: 7, semiMajorAxis: 0.15491578993093574, temperature: 289.23768124650184, habitableZone: true },
                { starId: 5, orbitalNumber: 3, planetType: 'A', diameter: 0, moonCount: 0, semiMajorAxis: 0.1940364066404433, temperature: 275.19923344695525, habitableZone: true },
                { starId: 5, orbitalNumber: 4, planetType: 'L', diameter: 9000, moonCount: 1, semiMajorAxis: 0.32898385723099194, temperature: 211.34965215652784, habitableZone: true },
                { starId: 5, orbitalNumber: 5, planetType: 'R', diameter: 8000, moonCount: 0, semiMajorAxis: 0.6156962225531007, temperature: 158.6263200586682, habitableZone: false },
                { starId: 6, orbitalNumber: 1, planetType: 'A', diameter: 0, moonCount: 0, semiMajorAxis: 0.07124936494704254, temperature: 454.1489690355491, habitableZone: false },
                { starId: 6, orbitalNumber: 2, planetType: 'R', diameter: 10000, moonCount: 0, semiMajorAxis: 0.15914203051617604, temperature: 307.173534634654, habitableZone: true },
                { starId: 6, orbitalNumber: 3, planetType: 'W', diameter: 900, moonCount: 0, semiMajorAxis: 0.22763955471459907, temperature: 229.58428271890392, habitableZone: true },
                { starId: 7, orbitalNumber: 1, planetType: 'G', diameter: 180000, moonCount: 8, semiMajorAxis: 0.07857457092299207, temperature: 406.1268522849122, habitableZone: false },
                { starId: 7, orbitalNumber: 2, planetType: 'S', diameter: 20000, moonCount: 1, semiMajorAxis: 0.150806392283815, temperature: 333.1519847782787, habitableZone: true },
                { starId: 7, orbitalNumber: 3, planetType: 'R', diameter: 10000, moonCount: 1, semiMajorAxis: 0.2208292296500025, temperature: 261.51962329973605, habitableZone: true },
                { starId: 7, orbitalNumber: 4, planetType: 'C', diameter: 6000, moonCount: 0, semiMajorAxis: 0.3001085941422529, temperature: 238.1442245652757, habitableZone: true },
                { starId: 7, orbitalNumber: 5, planetType: 'S', diameter: 28000, moonCount: 1, semiMajorAxis: 0.6096374701473373, temperature: 185.8031437175545, habitableZone: false },
                { starId: 7, orbitalNumber: 6, planetType: 'U', diameter: 91000, moonCount: 10, semiMajorAxis: 1.1313769891398104, temperature: 107.02840255399269, habitableZone: false },
                { starId: 7, orbitalNumber: 7, planetType: 'S', diameter: 22000, moonCount: 1, semiMajorAxis: 1.9890151687335436, temperature: 120.7204671447523, habitableZone: false },
                { starId: 8, orbitalNumber: 1, planetType: 'R', diameter: 10000, moonCount: 1, semiMajorAxis: 0.08277986194701725, temperature: 423.97346963482914, habitableZone: false },
                { starId: 8, orbitalNumber: 2, planetType: 'R', diameter: 10000, moonCount: 1, semiMajorAxis: 0.1315042458047, temperature: 337.41375388456447, habitableZone: false },
                { starId: 8, orbitalNumber: 3, planetType: 'S', diameter: 28000, moonCount: 0, semiMajorAxis: 0.1707547692789791, temperature: 315.49663134984615, habitableZone: true },
                { starId: 8, orbitalNumber: 4, planetType: 'S', diameter: 26000, moonCount: 0, semiMajorAxis: 0.3338886151177414, temperature: 237.01618662628445, habitableZone: true },
                { starId: 9, orbitalNumber: 1, planetType: 'S', diameter: 26000, moonCount: 0, semiMajorAxis: 0.07375612771247778, temperature: 459.18299889930717, habitableZone: false },
                { starId: 9, orbitalNumber: 2, planetType: 'S', diameter: 26000, moonCount: 1, semiMajorAxis: 0.14291442461047932, temperature: 341.13738973284745, habitableZone: false },
                { starId: 9, orbitalNumber: 3, planetType: 'D', diameter: 6000, moonCount: 0, semiMajorAxis: 0.2155507042119188, temperature: 255.2042487745957, habitableZone: true },
                { starId: 9, orbitalNumber: 4, planetType: 'R', diameter: 8000, moonCount: 0, semiMajorAxis: 0.30343956745670125, temperature: 223.83297617501174, habitableZone: true },
                { starId: 9, orbitalNumber: 5, planetType: 'S', diameter: 20000, moonCount: 0, semiMajorAxis: 0.539991934892252, temperature: 194.9205668755629, habitableZone: false },
                { starId: 10, orbitalNumber: 1, planetType: 'D', diameter: 6000, moonCount: 0, semiMajorAxis: 0.08614182814607335, temperature: 397.87846834353485, habitableZone: false },
                { starId: 10, orbitalNumber: 2, planetType: 'S', diameter: 14000, moonCount: 0, semiMajorAxis: 0.13017141724518888, temperature: 355.53308058599856, habitableZone: false },
                { starId: 10, orbitalNumber: 3, planetType: 'T', diameter: 15000, moonCount: 1, semiMajorAxis: 0.18582784444053058, temperature: 404.1034854487366, habitableZone: true },
                { starId: 10, orbitalNumber: 4, planetType: 'D', diameter: 5000, moonCount: 1, semiMajorAxis: 0.28544043141175773, temperature: 223.08111939338224, habitableZone: true },
                { starId: 10, orbitalNumber: 5, planetType: 'G', diameter: 160000, moonCount: 8, semiMajorAxis: 0.6182232134553686, temperature: 144.78716351851324, habitableZone: false },
                { starId: 10, orbitalNumber: 6, planetType: 'I', diameter: 9000, moonCount: 1, semiMajorAxis: 1.0036652756035886, temperature: 98.79813636974986, habitableZone: false }
            ]
        }
    },
    'test-seed-123': {
        systemCount: 3,
        sectorVolume: 1000,
        sector: {
            systems: [
                { systemId: 1, xPos: 7.916684605983287, yPos: 3.482839619487606, zPos: 6.284634642209312 },
                { systemId: 2, xPos: 7.39499793072755, yPos: 7.750003573382765, zPos: 1.1221179865416169 },
                { systemId: 3, xPos: 1.2995172196544857, yPos: 8.053639129705253, zPos: 8.835536676997526 }
            ],
            stars: [
                { starId: 1, systemId: 1, spectralClass: 'M', subclass: 3 },
                { starId: 2, systemId: 2, spectralClass: 'M', subclass: 9 },
                { starId: 3, systemId: 2, spectralClass: 'M', subclass: 5 },
                { starId: 4, systemId: 3, spectralClass: 'G', subclass: 8 }
            ],
            planets: [
                { starId: 1, orbitalNumber: 1, planetType: 'S', diameter: 24000, moonCount: 0, semiMajorAxis: 0.07966634102207482, temperature: 443.33441348786045, habitableZone: false },
                { starId: 1, orbitalNumber: 2, planetType: 'S', diameter: 26000, moonCount: 1, semiMajorAxis: 0.12974827664451538, temperature: 356.04717673340133, habitableZone: false },
                { starId: 1, orbitalNumber: 3, planetType: 'S', diameter: 18000, moonCount: 0, semiMajorAxis: 0.2068257912981007, temperature: 290.3227763046982, habitableZone: true },
                { starId: 1, orbitalNumber: 4, planetType: 'D', diameter: 8000, moonCount: 1, semiMajorAxis: 0.34100870494409896, temperature: 204.94853750346732, habitableZone: true },
                { starId: 2, orbitalNumber: 1, planetType: 'S', diameter: 24000, moonCount: 0, semiMajorAxis: 0.08901934706277448, temperature: 421.5579545105148, habitableZone: false },
                { starId: 2, orbitalNumber: 2, planetType: 'S', diameter: 22000, moonCount: 0, semiMajorAxis: 0.1339277174433089, temperature: 351.07669815891376, habitableZone: false },
                { starId: 2, orbitalNumber: 3, planetType: 'T', diameter: 6000, moonCount: 0, semiMajorAxis: 0.20212862394266776, temperature: 393.641972619778, habitableZone: true },
                { starId: 4, orbitalNumber: 1, planetType: 'D', diameter: 8000, moonCount: 0, semiMajorAxis: 0.40812773432464894, temperature: 408.4645246950596, habitableZone: false },
                { starId: 4, orbitalNumber: 2, planetType: 'C', diameter: 7000, moonCount: 0, semiMajorAxis: 0.746455523709936, temperature: 329.2900648975836, habitableZone: false },
                { starId: 4, orbitalNumber: 3, planetType: 'D', diameter: 7000, moonCount: 1, semiMajorAxis: 1.1102108444981442, temperature: 251.59335436259065, habitableZone: true },
                { starId: 4, orbitalNumber: 4, planetType: 'S', diameter: 14000, moonCount: 1, semiMajorAxis: 1.4833548378892845, temperature: 249.00909758200737, habitableZone: true }
            ]
        }
    }
};

describe('generation stability (golden fixture)', () => {
    Object.entries(GOLDEN).forEach(([seed, { systemCount, sectorVolume, sector: golden }]) => {
        describe(`seed "${seed}"`, () => {
            const actual = new StellarGenerator(seed).generateSector(systemCount, sectorVolume);

            test('produces the same systems (names excluded)', () => {
                const stripped = actual.systems.map((system) => ({
                    systemId: system.systemId,
                    xPos: system.xPos,
                    yPos: system.yPos,
                    zPos: system.zPos
                }));
                expect(stripped).toEqual(golden.systems);
            });

            test('produces the same stars (names excluded)', () => {
                const stripped = actual.stars.map((star) => ({
                    starId: star.starId,
                    systemId: star.systemId,
                    spectralClass: star.spectralClass,
                    subclass: star.subclass
                }));
                expect(stripped).toEqual(golden.stars);
            });

            test('produces the same planets', () => {
                const stripped = actual.planets.map((planet) => ({
                    starId: planet.starId,
                    orbitalNumber: planet.orbitalNumber,
                    planetType: planet.planetType,
                    diameter: planet.diameter,
                    moonCount: planet.moonCount,
                    semiMajorAxis: planet.semiMajorAxis,
                    temperature: planet.temperature,
                    habitableZone: planet.habitableZone
                }));
                expect(stripped).toEqual(golden.planets);
            });
        });
    });
});
