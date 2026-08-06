import React, { useCallback, useState } from 'react';
import {
  Alert,
  Button,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import RNFS from 'react-native-fs';
import {
  errorCodes,
  isErrorWithCode,
  keepLocalCopy,
  pick,
  types,
} from '@react-native-documents/picker';
import {
  extractAllText,
  extractPageText,
  extractText,
  getPageCount,
} from 'react-native-pdf-text-extractor';
import {
  MULTI_PAGE_PDF_BASE64,
  PLAIN_TEXT_PDF_BASE64,
  SCANNED_IMAGE_PDF_BASE64,
} from './sampleAssets';

type BundledSample = 'plain' | 'multi' | 'scanned';

const BUNDLED_SAMPLES: Record<
  BundledSample,
  { label: string; base64: string; fileName: string }
> = {
  plain: {
    label: 'Plain text (1 page)',
    base64: PLAIN_TEXT_PDF_BASE64,
    fileName: 'sample-plain-text.pdf',
  },
  multi: {
    label: 'Multi-page (5 pages)',
    base64: MULTI_PAGE_PDF_BASE64,
    fileName: 'sample-multi-page.pdf',
  },
  scanned: {
    label: 'Scanned / image-only (2 pages)',
    base64: SCANNED_IMAGE_PDF_BASE64,
    fileName: 'sample-scanned-image-only.pdf',
  },
};

function describeError(error: unknown): string {
  const code = (error as { code?: string } | undefined)?.code;
  let message: string;
  if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === 'string') {
    message = error;
  } else {
    message = JSON.stringify(error);
  }
  return code ? `[${code}] ${message}` : message;
}

export default function App() {
  const [filePath, setFilePath] = useState<string | null>(null);
  const [fileLabel, setFileLabel] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [pages, setPages] = useState<string[] | null>(null);
  const [wholeText, setWholeText] = useState<string | null>(null);
  const [pageIndexInput, setPageIndexInput] = useState('0');
  const [singlePageText, setSinglePageText] = useState<string | null>(null);
  const [errorTestResult, setErrorTestResult] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const runExtraction = useCallback(async (path: string, label: string) => {
    setBusy(true);
    setLoadError(null);
    setSinglePageText(null);
    setErrorTestResult(null);
    try {
      const count = await getPageCount(path);
      const [all, whole] = await Promise.all([
        extractAllText(path),
        extractText(path),
      ]);
      setFilePath(path);
      setFileLabel(label);
      setPageCount(count);
      setPages(all);
      setWholeText(whole);
    } catch (error) {
      setLoadError(describeError(error));
      setFilePath(null);
      setFileLabel(null);
      setPageCount(null);
      setPages(null);
      setWholeText(null);
    } finally {
      setBusy(false);
    }
  }, []);

  const loadBundledSample = useCallback(
    async (sample: BundledSample) => {
      const { base64, fileName, label } = BUNDLED_SAMPLES[sample];
      const path = `${RNFS.CachesDirectoryPath}/${fileName}`;
      await RNFS.writeFile(path, base64, 'base64');
      await runExtraction(path, label);
    },
    [runExtraction]
  );

  const pickFromDevice = useCallback(async () => {
    try {
      const [picked] = await pick({ type: [types.pdf] });
      const fileName = picked.name ?? 'picked-document.pdf';
      const [copy] = await keepLocalCopy({
        files: [{ uri: picked.uri, fileName }],
        destination: 'cachesDirectory',
      });
      if (copy.status === 'error') {
        throw new Error(copy.copyError);
      }
      await runExtraction(copy.localUri, fileName);
    } catch (error) {
      // A cancelled picker rejects too; don't surface that as an error.
      if (isErrorWithCode(error) && error.code === errorCodes.OPERATION_CANCELED) {
        return;
      }
      Alert.alert('Document picker error', describeError(error));
    }
  }, [runExtraction]);

  const runExtractPageText = useCallback(async () => {
    if (!filePath) {
      return;
    }
    const pageIndex = Number(pageIndexInput);
    setSinglePageText(null);
    try {
      const text = await extractPageText(filePath, pageIndex);
      setSinglePageText(text);
    } catch (error) {
      setSinglePageText(`Error: ${describeError(error)}`);
    }
  }, [filePath, pageIndexInput]);

  const testNonexistentFile = useCallback(async () => {
    setErrorTestResult(null);
    try {
      await getPageCount('/no/such/path/definitely-missing.pdf');
      setErrorTestResult('Unexpected: resolved without error');
    } catch (error) {
      setErrorTestResult(`getPageCount on missing file -> ${describeError(error)}`);
    }
  }, []);

  const testInvalidPageIndex = useCallback(async () => {
    if (!filePath) {
      setErrorTestResult('Load a document first to test an invalid page index.');
      return;
    }
    setErrorTestResult(null);
    try {
      await extractPageText(filePath, 999999);
      setErrorTestResult('Unexpected: resolved without error');
    } catch (error) {
      setErrorTestResult(
        `extractPageText with out-of-range index -> ${describeError(error)}`
      );
    }
  }, [filePath]);

  return (
    <View style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>react-native-pdf-text-extractor</Text>

        <Text style={styles.sectionTitle}>Load a bundled sample</Text>
        {(Object.keys(BUNDLED_SAMPLES) as BundledSample[]).map((key) => (
          <View style={styles.buttonRow} key={key}>
            <Button
              title={BUNDLED_SAMPLES[key].label}
              onPress={() => loadBundledSample(key)}
              disabled={busy}
            />
          </View>
        ))}

        <Text style={styles.sectionTitle}>Or pick a PDF from the device</Text>
        <View style={styles.buttonRow}>
          <Button title="Pick a PDF…" onPress={pickFromDevice} disabled={busy} />
        </View>

        {loadError ? <Text style={styles.error}>{loadError}</Text> : null}

        {filePath ? (
          <View style={styles.resultBlock}>
            <Text style={styles.sectionTitle}>Loaded: {fileLabel}</Text>
            <Text style={styles.mono}>{filePath}</Text>
            <Text style={styles.label}>getPageCount() -&gt; {pageCount}</Text>

            <Text style={styles.label}>extractAllText() per page:</Text>
            {pages?.map((text, index) => (
              <View style={styles.pageBlock} key={index}>
                <Text style={styles.pageHeader}>Page {index}</Text>
                <Text style={styles.mono}>
                  {text.length > 0 ? text : '(empty — no extractable text)'}
                </Text>
              </View>
            ))}

            <Text style={styles.label}>extractText() concatenated:</Text>
            <Text style={styles.mono}>
              {wholeText && wholeText.length > 0
                ? wholeText
                : '(empty — no extractable text)'}
            </Text>

            <Text style={styles.sectionTitle}>extractPageText(path, index)</Text>
            <View style={styles.buttonRow}>
              <TextInput
                style={styles.input}
                keyboardType="number-pad"
                value={pageIndexInput}
                onChangeText={setPageIndexInput}
              />
              <Button title="Extract page" onPress={runExtractPageText} />
            </View>
            {singlePageText !== null ? (
              <Text style={styles.mono}>{singlePageText}</Text>
            ) : null}
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>Error-case checks</Text>
        <View style={styles.buttonRow}>
          <Button title="Nonexistent file path" onPress={testNonexistentFile} />
        </View>
        <View style={styles.buttonRow}>
          <Button title="Invalid page index" onPress={testInvalidPageIndex} />
        </View>
        {errorTestResult ? <Text style={styles.mono}>{errorTestResult}</Text> : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, paddingTop: 48 },
  content: { padding: 16, paddingBottom: 48 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '600', marginTop: 20, marginBottom: 8 },
  buttonRow: { marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
  resultBlock: { marginTop: 12 },
  label: { fontWeight: '600', marginTop: 12 },
  mono: {
    fontFamily: 'Courier',
    fontSize: 12,
    marginTop: 4,
    color: '#333',
  },
  error: { color: '#c0392b', marginTop: 8 },
  pageBlock: {
    marginTop: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
  },
  pageHeader: { fontWeight: '600', fontSize: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    width: 60,
  },
});
