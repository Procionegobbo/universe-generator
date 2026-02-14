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
    { name: 'rocky', prompt: 'A rugged, rocky planet with a cratered surface, mountains, and canyons. No visible atmosphere, sharp shadows, and a barren, desolate appearance. High-resolution, photorealistic, isolated on black background.' },
    { name: 'carbon', prompt: 'A rare carbon planet with a dark, graphite-black surface and diamond-like glints. Subtle blue or purple atmospheric haze, jagged terrain, and reflective patches. Cinematic lighting, deep space background.' },
    { name: 'desert', prompt: 'A dry, arid desert planet with vast sand dunes, rocky plateaus, and minimal vegetation. Warm ochre and tan colors, thin atmosphere, and dust storms visible. High detail, realistic planetary photography.' },
    { name: 'hell', prompt: 'An extreme hell planet with a scorched, volcanic surface. Rivers of lava, erupting volcanoes, and a thick, toxic atmosphere glowing red and orange. Intense heat distortion, dramatic lighting, space background.' },
    { name: 'molten', prompt: 'A young, molten planet with a glowing, partially liquid surface. Bright orange and yellow magma flows, volcanic eruptions, and a thin, smoky atmosphere. High contrast, photorealistic, cosmic setting.' },
    { name: 'earthlike', prompt: 'A vibrant, Earth-like planet with blue oceans, green continents, white clouds, and polar ice caps. Lush, life-supporting appearance, realistic atmospheric scattering, and visible weather patterns. 4k, space photography, isolated on black background.' },
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
