#!/usr/bin/env python3
"""Compose App Store / Play Store marketing screenshots for LivSight.

Mockups (PSD, on Desktop):
  - App Store  : Free_iPhone_16_Mockup_5.psd   (frame "iPhone", screen "Design")
  - Play Store : Free_Samsung_S10_Mockup_1.psd (frame "Case",   screen "Screen")

For the Samsung frame, the iOS status bar + Dynamic Island area is cropped
from the raw capture so no iOS chrome shows inside an Android phone.

Outputs:
  - store-final/ios/   1290x2796 (App Store iPhone 6.7")
  - store-final/play/  1080x1920 (Google Play 9:16)
  - store-final/play/feature-graphic.png 1024x500
"""

import os
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont
from psd_tools import PSDImage

ROOT = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(ROOT, "store")
OUT_IOS = os.path.join(ROOT, "store-final", "ios")
OUT_PLAY = os.path.join(ROOT, "store-final", "play")

PSD_IPHONE = os.path.expanduser("~/Desktop/Free_iPhone_16_Mockup_5.psd")
PSD_SAMSUNG = os.path.expanduser("~/Desktop/Free_Samsung_S10_Mockup_1.psd")

NODE = os.path.join(ROOT, "..", "node_modules", "@expo-google-fonts")
FONT_TITLE = os.path.join(NODE, "palanquin", "700Bold", "Palanquin_700Bold.ttf")
FONT_BODY = os.path.join(NODE, "montserrat", "600SemiBold", "Montserrat_600SemiBold.ttf")

PRIMARY = (14, 165, 233)
PRIMARY_DARK = (2, 132, 199)
TEXT_DARK = (25, 28, 29)
BG_LIGHT_TOP = (255, 255, 255)
BG_LIGHT_BOTTOM = (224, 242, 254)  # colors.iconBg

IOS_STATUS_BAR_CROP = 170  # px of raw capture holding iOS status bar + island

SHOTS = [
    ("01-accueil.png", ["Suivez vos livraisons", "en temps réel"]),
    ("07-demande.png", ["Commandez une livraison", "en quelques gestes"]),
    ("03-detail.png", ["Chaque étape,", "sous vos yeux"]),
    ("08-inbox.png", ["Soyez alerté", "à chaque mouvement"]),
    ("02-courses.png", ["Toutes vos courses,", "au même endroit"]),
    ("04-rapports.png", ["Vos performances", "en un coup d'œil"]),
    ("05-stock.png", ["Votre stock,", "toujours à jour"]),
    ("06-tarifs.png", ["Des tarifs clairs,", "sans surprise"]),
]

# Blur zones per raw file (PII), in raw-capture pixel coords (1206x2622)
BLUR_ZONES = {
    "03-detail.png": [(90, 1460, 560, 1600)],  # client phone number
}


def find_layer(layers, name, kind=None):
    for l in layers:
        if l.name == name and (kind is None or l.kind == kind):
            return l
        if l.is_group():
            found = find_layer(l, name, kind)
            if found:
                return found
    return None


def load_mockup(path, frame_name, screen_name, screen_kind):
    psd = PSDImage.open(path)
    mockup = next(l for l in psd if l.name == "Mockup")

    frame_layer = find_layer(mockup, frame_name)
    screen_layer = find_layer(mockup, screen_name, kind=screen_kind)
    highlights_layer = find_layer(mockup, "Highlights", kind="pixel")

    frame_bbox = frame_layer.bbox
    frame = frame_layer.composite().convert("RGBA")

    screen_img = screen_layer.composite().convert("RGBA")
    screen_mask = screen_img.split()[3]
    screen_bbox = screen_layer.bbox

    highlights = highlights_layer.composite().convert("RGBA")
    hb = highlights_layer.bbox
    highlights = highlights.crop(
        (frame_bbox[0] - hb[0], frame_bbox[1] - hb[1], frame_bbox[2] - hb[0], frame_bbox[3] - hb[1])
    )

    return {
        "frame": frame,
        "frame_size": (frame_bbox[2] - frame_bbox[0], frame_bbox[3] - frame_bbox[1]),
        "screen_size": (screen_bbox[2] - screen_bbox[0], screen_bbox[3] - screen_bbox[1]),
        "screen_offset": (screen_bbox[0] - frame_bbox[0], screen_bbox[1] - frame_bbox[1]),
        "screen_mask": screen_mask,
        "highlights": highlights,
    }


MOCK_IPHONE = load_mockup(PSD_IPHONE, "iPhone", "Design", "smartobject")
MOCK_SAMSUNG = load_mockup(PSD_SAMSUNG, "Case", "Screen", "pixel")


def vertical_gradient(size, top, bottom):
    w, h = size
    img = Image.new("RGB", size)
    px = img.load()
    for y in range(h):
        t = y / max(h - 1, 1)
        c = tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3))
        for x in range(w):
            px[x, y] = c
    return img


def make_background(size, style):
    if style == "gradient":
        return vertical_gradient(size, PRIMARY, PRIMARY_DARK)
    return vertical_gradient(size, BG_LIGHT_TOP, BG_LIGHT_BOTTOM)


def apply_blur_zones(shot, name):
    zones = BLUR_ZONES.get(name)
    if not zones:
        return shot
    for box in zones:
        region = shot.crop(box).filter(ImageFilter.GaussianBlur(20))
        shot.paste(region, box)
    return shot


def build_phone(raw_path, mock, crop_top=0):
    """Assemble frame + screenshot + highlights into one RGBA asset."""
    name = os.path.basename(raw_path)
    shot = Image.open(raw_path).convert("RGB")
    shot = apply_blur_zones(shot, name)
    if crop_top:
        shot = shot.crop((0, crop_top, shot.width, shot.height))
    shot = shot.resize(mock["screen_size"], Image.LANCZOS)

    frame_w, frame_h = mock["frame_size"]
    asset = Image.new("RGBA", (frame_w, frame_h), (0, 0, 0, 0))
    asset.paste(mock["frame"], (0, 0), mock["frame"])

    shot_rgba = Image.new("RGBA", shot.size, (0, 0, 0, 0))
    shot_rgba.paste(shot, (0, 0), mock["screen_mask"])
    asset.alpha_composite(shot_rgba, mock["screen_offset"])

    # Screen-blend the highlights, constrained to the phone's own alpha
    base = asset.convert("RGB")
    hl = mock["highlights"].convert("RGB")
    blended = ImageChops.screen(base, hl)
    asset_rgb = Image.composite(blended, base, asset.split()[3])
    out = asset_rgb.convert("RGBA")
    out.putalpha(asset.split()[3])
    return out


def compose(raw_path, caption, style, canvas_size, caption_font_size, phone_width, mock, crop_top=0):
    W, H = canvas_size
    canvas = make_background(canvas_size, style)
    draw = ImageDraw.Draw(canvas)

    font = ImageFont.truetype(FONT_TITLE, caption_font_size)
    color = (255, 255, 255) if style == "gradient" else TEXT_DARK
    line_h = int(caption_font_size * 1.25)
    y = int(H * 0.055)
    for i, line in enumerate(caption):
        tw = draw.textlength(line, font=font)
        draw.text(((W - tw) / 2, y + i * line_h), line, font=font, fill=color)
    block_bottom = y + line_h * len(caption)

    phone = build_phone(raw_path, mock, crop_top)
    pscale = phone_width / phone.width
    phone = phone.resize((phone_width, int(phone.height * pscale)), Image.LANCZOS)

    px = (W - phone.width) // 2
    py = block_bottom + int(H * 0.028)

    # Soft drop shadow from the phone's own silhouette
    alpha = phone.split()[3].point(lambda a: int(a * 0.32))
    shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    shadow.paste(Image.new("RGBA", phone.size, (0, 0, 0, 255)), (px, py + 22), alpha)
    shadow = shadow.filter(ImageFilter.GaussianBlur(30))
    canvas = Image.alpha_composite(canvas.convert("RGBA"), shadow)

    canvas.alpha_composite(phone, (px, py))
    return canvas.convert("RGB")


def feature_graphic():
    size = (1024, 500)
    img = vertical_gradient(size, PRIMARY, PRIMARY_DARK)
    draw = ImageDraw.Draw(img)

    logo_path = os.path.join(ROOT, "..", "assets", "images", "logo.png")
    logo = Image.open(logo_path).convert("RGBA")
    logo.thumbnail((170, 170), Image.LANCZOS)
    tile = Image.new("RGBA", (200, 200), (0, 0, 0, 0))
    ImageDraw.Draw(tile).rounded_rectangle([0, 0, 199, 199], radius=48, fill=(255, 255, 255, 255))
    tile.paste(logo, ((200 - logo.width) // 2, (200 - logo.height) // 2), logo)
    img.paste(tile, (80, (500 - 200) // 2), tile)

    title_font = ImageFont.truetype(FONT_TITLE, 76)
    sub_font = ImageFont.truetype(FONT_BODY, 34)
    draw.text((330, 160), "LivSight", font=title_font, fill=(255, 255, 255))
    draw.text((334, 270), "Vos livraisons, maîtrisées.", font=sub_font, fill=(255, 255, 255, 235))
    return img


def main():
    os.makedirs(OUT_IOS, exist_ok=True)
    os.makedirs(OUT_PLAY, exist_ok=True)

    for i, (name, caption) in enumerate(SHOTS, start=1):
        style = "light" if i % 2 == 1 else "gradient"
        raw = os.path.join(RAW, name)
        slug = os.path.splitext(name)[0].split("-", 1)[1]

        compose(raw, caption, style, (1290, 2796), 86, 1040, MOCK_IPHONE).save(
            os.path.join(OUT_IOS, f"{i:02d}-{slug}.png")
        )
        compose(raw, caption, style, (1080, 1920), 58, 700, MOCK_SAMSUNG, crop_top=IOS_STATUS_BAR_CROP).save(
            os.path.join(OUT_PLAY, f"{i:02d}-{slug}.png")
        )
        print(f"{i:02d}-{slug}: ios + play")

    feature_graphic().save(os.path.join(OUT_PLAY, "feature-graphic.png"))
    print("feature-graphic: play")


if __name__ == "__main__":
    main()
