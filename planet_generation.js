import { writeFile } from "fs/promises";
import Replicate from "replicate";
import path from "path";
import dotenv from "dotenv";
import fetch from "node-fetch";
dotenv.config({ path: ".env.development.local" });

const OUTPUT_DIR = path.join(process.cwd(), "frontend/public/images/planets");

// List of planet prompts and their types
const planetPrompts = [
    { name: 'asteroid', prompt: 'A dense, sprawling asteroid belt in deep space. Countless rocky bodies of various sizes, some with craters and metallic glints, orbiting a star. Dust clouds and subtle light scattering. High detail, photorealistic, cosmic background.' },
    { name: 'gasgiant', prompt: 'A massive gas giant planet with swirling, colorful cloud bands and a prominent storm. Shades of orange, brown, and white, with faint rings and several small moons in the distance. Realistic atmospheric depth, 4k, space photography style.' },
    { name: 'hotgasgiant', prompt: 'A hot gas giant orbiting close to its star, with glowing, turbulent cloud bands, intense storms, and a bright, sunlit limb. High temperature color palette, photorealistic, cosmic background.' },
    { name: 'icegiant', prompt: 'An ice giant planet with a blue or cyan hue, faint rings, and a thick, hazy atmosphere. Subtle banding, distant moons, and a cold, deep space setting. High detail, photorealistic.' },
    { name: 'super_earth', prompt: 'A super-Earth planet, larger than Earth but smaller than Neptune. Rocky surface with continents, shallow seas, and a thick, dynamic atmosphere. Lush or arid regions, photorealistic, cosmic background.' },
    { name: 'rocky', prompt: 'A rugged, rocky planet with a cratered surface, mountains, and canyons. No visible atmosphere, sharp shadows, and a barren, desolate appearance. High-resolution, photorealistic, isolated on black background.' },
    { name: 'earthlike', prompt: 'A vibrant, Earth-like planet with blue oceans, green continents, white clouds, and polar ice caps. Lush, life-supporting appearance, realistic atmospheric scattering, and visible weather patterns. 4k, space photography, isolated on black background.' },
    { name: 'ocean', prompt: 'An ocean planet covered almost entirely by deep blue water, with swirling white clouds and occasional small islands. Reflective surface, photorealistic, cosmic background.' },
    { name: 'ice', prompt: 'A frozen ice planet with a bright, reflective surface, glaciers, and polar storms. Subtle blue and white tones, possible subsurface ocean, photorealistic, deep space.' },
    { name: 'desert', prompt: 'A dry, arid desert planet with vast sand dunes, rocky plateaus, and minimal vegetation. Warm ochre and tan colors, thin atmosphere, and dust storms visible. High detail, realistic planetary photography.' },
    { name: 'carbon', prompt: 'A rare carbon planet with a dark, graphite-black surface and diamond-like glints. Subtle blue or purple atmospheric haze, jagged terrain, and reflective patches. Cinematic lighting, deep space background.' },
    { name: 'silicate', prompt: 'A silicate planet with a rocky, dusty surface, scattered with mineral deposits and glassy plains. Thin or no atmosphere, photorealistic, cosmic background.' },
    { name: 'iron', prompt: 'A dense iron planet with a metallic, rust-colored surface, impact craters, and little or no atmosphere. High detail, photorealistic, cosmic background.' },
    { name: 'toxic', prompt: 'A toxic planet with a thick, poisonous atmosphere, swirling clouds of green and yellow, and a hostile, barren surface. Photorealistic, cosmic background.' },
    { name: 'ammonia', prompt: 'A planet with an ammonia-rich atmosphere, pale yellow and white clouds, and possible ammonia seas. Cold, photorealistic, cosmic background.' },
    { name: 'methane', prompt: 'A planet with a methane-rich atmosphere, blue or turquoise haze, and possible methane lakes or seas. Photorealistic, cosmic background.' },
    { name: 'jungle', prompt: 'A lush jungle planet covered in dense, green forests, misty valleys, and winding rivers. Thick clouds, vibrant colors, photorealistic, cosmic background.' },
    { name: 'dwarf', prompt: 'A small dwarf planet with a rocky or icy surface, impact craters, and a faint, distant sun. Photorealistic, cosmic background.' },
    { name: 'hell', prompt: 'An extreme hell planet with a scorched, volcanic surface. Rivers of lava, erupting volcanoes, and a thick, toxic atmosphere glowing red and orange. Intense heat distortion, dramatic lighting, space background.' },
    { name: 'molten', prompt: 'A young, molten planet with a glowing, partially liquid surface. Bright orange and yellow magma flows, volcanic eruptions, and a thin, smoky atmosphere. High contrast, photorealistic, cosmic setting.' },
    { name: 'cold_desert', prompt: 'A cold desert planet with a barren, rocky surface, patches of frost, and a thin, icy atmosphere. Subtle blue and tan tones, photorealistic, cosmic background.' },
    { name: 'unknown', prompt: 'A mysterious, undefined planet shrouded in shadow and mist. Indistinct surface features, ambiguous color palette, and an enigmatic aura. Cinematic, high detail, cosmic background.' }
];

const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN
});

async function generateAndSavePlanetImages(selectedType) {
    let targets;
    if (selectedType === 'all') {
        targets = planetPrompts;
    } else {
        targets = planetPrompts.filter(p => p.name === selectedType);
        if (targets.length === 0) {
            console.error(`Unknown planet type: ${selectedType}`);
            printInstructions();
            process.exit(1);
        }
    }
    for (const { name, prompt } of targets) {
        try {
            console.log(`Generating image for: ${name}`);
            const output = await replicate.run("google/imagen-4-fast", {
                input: {
                    prompt,
                    aspect_ratio: "4:3"
                }
            });
            // output is an array of URLs, take the first
            const imageUrl = Array.isArray(output) ? output[0] : output.url();
            if (!imageUrl) throw new Error("Image URL not found");
            const res = await fetch(imageUrl);
            const buffer = Buffer.from(await res.arrayBuffer());
            await writeFile(path.join(OUTPUT_DIR, `${name}.png`), buffer);
            console.log(`Saved as: ${name}.png`);
        } catch (err) {
            console.error(`Error for "${name}":`, err.message);
        }
    }
}

function printInstructions() {
    console.log(`\nUsage: node planet_generation.js <type>\n`);
    console.log(`Where <type> can be one of: all, ${planetPrompts.map(p => p.name).join(', ')}`);
    console.log(`\nExamples:`);
    console.log(`  node planet_generation.js all        # generate all planet images`);
    console.log(`  node planet_generation.js rocky      # generate only the rocky planet image`);
}

const arg = process.argv[2];
if (!arg) {
    printInstructions();
    process.exit(0);
}

generateAndSavePlanetImages(arg);
