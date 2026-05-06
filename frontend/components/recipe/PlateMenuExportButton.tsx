// frontend/components/recipe/PlateMenuExportButton.tsx
// Group 10X Phase 9 — Export a saved plate as a Sazon-branded "build-your-own"
// menu PDF. Each slot becomes a column ("Pick a Protein… Pick a Base…") with
// the user's saved variants listed below. After generation, opens the native
// share sheet so the user can text/AirDrop/email the PDF.
//
// Mounted by the home/cookbook agent on /recipe/[id].tsx, gated by
// recipe.source === 'user-composed'. This component is intentionally
// self-contained — drop it in and it just works.

import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import BrandButton from '../ui/BrandButton';
import Sazon from '../mascot/Sazon';
import { Shadows } from '../../constants/Shadows';
import { Pastel, PastelDark } from '../../constants/Colors';
import { useTheme } from '../../contexts/ThemeContext';

// ─── Public types ──────────────────────────────────────────────────────────────

export interface PlateMenuVariant {
  id: string;
  name: string;
  portionGrams?: number;
}

export interface PlateMenuComponent {
  slot: string;
  /** Display label for the column header (e.g. "Protein") */
  label: string;
  variants: PlateMenuVariant[];
}

export interface PlateMenuPlate {
  id: string;
  title: string;
  components: PlateMenuComponent[];
  totalCalories?: number;
  totalProtein?: number;
  totalCarbs?: number;
  totalFat?: number;
}

interface PlateMenuExportButtonProps {
  plate: PlateMenuPlate;
  testID?: string;
}

/**
 * ROADMAP 4.0 RD1.2 — imperative export so the recipe-detail action menu can
 * trigger PDF export without re-rendering a full button. Returns true on a
 * successful export, false on cancellation / failure (caller stays silent).
 */
export async function exportPlateMenuPdf(plate: PlateMenuPlate): Promise<boolean> {
  try {
    const html = buildMenuHtml(plate);
    const result = await Print.printToFileAsync({ html });
    const uri = result?.uri;
    if (!uri) return false;
    const sharingAvailable = await Sharing.isAvailableAsync();
    if (sharingAvailable) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Share your plate menu',
        UTI: 'com.adobe.pdf',
      });
    }
    return true;
  } catch {
    return false;
  }
}

// ─── HTML template ────────────────────────────────────────────────────────────

const escapeHtml = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatGrams = (g?: number): string => (typeof g === 'number' && g > 0 ? `${Math.round(g)}g` : '');

const formatStat = (n?: number): string => (typeof n === 'number' ? Math.round(n).toString() : '—');

export const buildMenuHtml = (plate: PlateMenuPlate): string => {
  const columns = plate.components
    .map((c) => {
      const variantList = c.variants
        .map((v) => {
          const portion = formatGrams(v.portionGrams);
          return `<li><span class="variant-name">${escapeHtml(v.name)}</span>${
            portion ? `<span class="variant-portion">${portion}</span>` : ''
          }</li>`;
        })
        .join('');
      return `
        <section class="column">
          <h2>Pick a ${escapeHtml(c.label)}</h2>
          <ul>${variantList}</ul>
        </section>
      `;
    })
    .join('');

  const macros = `
    <div class="macro"><span class="num">${formatStat(plate.totalCalories)}</span><span class="unit">kcal</span></div>
    <div class="macro"><span class="num">${formatStat(plate.totalProtein)}</span><span class="unit">g protein</span></div>
    <div class="macro"><span class="num">${formatStat(plate.totalCarbs)}</span><span class="unit">g carbs</span></div>
    <div class="macro"><span class="num">${formatStat(plate.totalFat)}</span><span class="unit">g fat</span></div>
  `;

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      @page { margin: 0.6in; size: letter; }
      * { box-sizing: border-box; }
      body {
        font-family: -apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif;
        color: #2C1810;
        margin: 0;
        padding: 0;
        background: #FAF7F4;
      }
      .header {
        text-align: center;
        padding: 12px 0 24px;
        border-bottom: 0;
      }
      .eyebrow {
        text-transform: uppercase;
        letter-spacing: 4px;
        font-size: 11px;
        color: #fa7e12;
        font-weight: 700;
        margin: 0 0 6px;
      }
      .title {
        font-size: 32px;
        font-weight: 800;
        margin: 0;
        letter-spacing: -0.5px;
      }
      .subtitle {
        font-size: 13px;
        color: #5A4534;
        margin: 6px 0 0;
      }
      .columns {
        display: flex;
        flex-wrap: wrap;
        gap: 18px;
        padding: 24px 0;
      }
      .column {
        flex: 1 1 calc(33% - 18px);
        min-width: 180px;
        background: #FFFFFF;
        border-radius: 20px;
        padding: 18px 20px;
      }
      .column h2 {
        font-size: 14px;
        text-transform: uppercase;
        letter-spacing: 1.5px;
        color: #fa7e12;
        margin: 0 0 12px;
        font-weight: 800;
      }
      .column ul {
        margin: 0;
        padding: 0;
        list-style: none;
      }
      .column li {
        font-size: 15px;
        font-weight: 600;
        color: #2C1810;
        padding: 8px 0;
        display: flex;
        justify-content: space-between;
      }
      .variant-portion {
        font-size: 12px;
        color: #5A4534;
        font-weight: 400;
      }
      .footer {
        margin-top: 16px;
        padding: 18px 20px;
        background: #FFF3E0;
        border-radius: 20px;
        display: flex;
        justify-content: space-around;
        align-items: center;
      }
      .macro {
        text-align: center;
      }
      .macro .num {
        display: block;
        font-size: 22px;
        font-weight: 800;
        color: #2C1810;
      }
      .macro .unit {
        display: block;
        font-size: 11px;
        color: #5A4534;
        margin-top: 2px;
      }
      .signoff {
        text-align: center;
        font-size: 11px;
        color: #5A4534;
        margin-top: 14px;
        opacity: 0.7;
      }
    </style>
  </head>
  <body>
    <div class="header">
      <p class="eyebrow">Sazon menu</p>
      <h1 class="title">${escapeHtml(plate.title)}</h1>
      <p class="subtitle">A build-your-own template — pick one from each column.</p>
    </div>
    <div class="columns">${columns}</div>
    <div class="footer">${macros}</div>
    <p class="signoff">Made with Sazon Chef</p>
  </body>
</html>`;
};

// ─── Component ────────────────────────────────────────────────────────────────

const TOAST_VISIBLE_MS = 2400;

export default function PlateMenuExportButton({ plate, testID = 'plate-menu-export-button' }: PlateMenuExportButtonProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [busy, setBusy] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const isMounted = useRef(true);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      isMounted.current = false;
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const handleExport = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const ok = await exportPlateMenuPdf(plate);
      if (!isMounted.current || !ok) return;
      setShowToast(true);
      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => {
        if (isMounted.current) setShowToast(false);
      }, TOAST_VISIBLE_MS);
    } catch {
      // Silent — share sheet cancellation is the most common cause and
      // shouldn't surface as an error. The user can just tap again.
    } finally {
      if (isMounted.current) setBusy(false);
    }
  }, [busy, plate]);

  const toastBg = isDark ? PastelDark.peach : Pastel.peach;
  const toastTextColor = isDark ? '#F5F0EB' : '#5A4534';

  return (
    <View style={styles.wrapper}>
      <BrandButton
        label="Export as menu"
        variant="golden"
        icon="document-text-outline"
        onPress={handleExport}
        loading={busy}
        disabled={busy}
        testID={testID}
        accessibilityLabel="Export this plate as a printable menu"
      />
      {showToast && (
        <View
          testID="plate-menu-export-toast"
          accessibilityLiveRegion="polite"
          style={[styles.toast, { backgroundColor: toastBg }, Shadows.MD]}
        >
          <View style={styles.toastMascot}>
            <Sazon variant="orange" motion="kiss" fx={['hearts']} size={36} />
          </View>
          <Text style={[styles.toastText, { color: toastTextColor }]}>
            Your menu is ready to share.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  toast: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  toastMascot: {
    marginRight: 12,
  },
  toastText: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
});
