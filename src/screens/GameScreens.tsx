import React, { useEffect, useRef, useState } from 'react';
import {
  ImageBackground,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGame } from '../context/GameContext';
import { PrimaryButton } from '../components/PrimaryButton';
import { colors } from '../theme/colors';
import { radii, spacing } from '../theme/spacing';
import type { NormalizedQuestion } from '../data/types';
import { CATEGORY_OPTIONS } from '../data/types';
import { fireCorrectAnswerConfetti } from '../effects/confettiCorrect';

export function GameScreens() {
  const { state, dispatch } = useGame();

  switch (state.screen) {
    case 'splash':
      return <SplashView onContinue={() => dispatch({ type: 'SPLASH_DONE' })} />;
    case 'playerCount':
      return <PlayerCountView />;
    case 'names':
      return <NamesView />;
    case 'settings':
      return <SettingsView />;
    case 'category':
      return <CategoryView />;
    case 'countdown':
      return <CountdownView />;
    case 'question':
      return <QuestionView />;
    case 'feedback':
      return <FeedbackView />;
    case 'playerSetScore':
      return <PlayerSetScoreView />;
    case 'roundSummary':
      return <RoundSummaryView />;
    case 'final':
      return <FinalView />;
    default:
      return null;
  }
}

function SplashView({ onContinue }: { onContinue: () => void }) {
  return (
    <ImageBackground
      source={require('../../assets/splash-hero.png')}
      style={styles.splashRoot}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.splashSafe}>
        <View style={styles.splashFooter}>
          <PrimaryButton title="Ξεκίνα" onPress={onContinue} variant="yellow" />
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

function StepNavRow({
  onBack,
  nextTitle,
  onNext,
  nextVariant = 'yellow',
}: {
  onBack: () => void;
  nextTitle: string;
  onNext: () => void;
  nextVariant?: 'yellow' | 'blue' | 'red' | 'green';
}) {
  return (
    <View style={styles.stepNavRow}>
      <PrimaryButton title="Πίσω" onPress={onBack} variant="blue" style={styles.stepNavBtn} />
      <PrimaryButton title={nextTitle} onPress={onNext} variant={nextVariant} style={styles.stepNavBtn} />
    </View>
  );
}

function PlayerCountView() {
  const { dispatch } = useGame();
  const [n, setN] = useState(2);
  return (
    <ScreenPad>
      <Text style={styles.title}>Επιλογή αριθμού παικτών</Text>
      <View style={styles.row}>
        {[1, 2, 3, 4].map((x) => (
          <PrimaryButton
            key={x}
            title={String(x)}
            onPress={() => setN(x)}
            variant={n === x ? 'red' : 'blue'}
            style={styles.numBtn}
          />
        ))}
      </View>
      <StepNavRow
        onBack={() => dispatch({ type: 'SETUP_BACK' })}
        nextTitle="Επόμενο"
        onNext={() => dispatch({ type: 'SET_PLAYER_COUNT', count: n })}
      />
    </ScreenPad>
  );
}

function NamesView() {
  const { state, dispatch } = useGame();
  const [text, setText] = useState(state.tempNames[state.nameIndex] ?? '');
  useEffect(() => {
    setText(state.tempNames[state.nameIndex] ?? '');
  }, [state.nameIndex, state.tempNames]);
  return (
    <ScreenPad>
      <Text style={styles.title}>Όνομα παίκτη ({state.nameIndex + 1})</Text>
      <TextInput
        style={styles.input}
        value={text}
        onChangeText={setText}
        placeholder="Όνομα ή ομάδα"
        placeholderTextColor={colors.muted}
      />
      {state.errorMessage ? <Text style={styles.err}>{state.errorMessage}</Text> : null}
      <StepNavRow
        onBack={() => {
          dispatch({ type: 'SET_NAME', name: text });
          dispatch({ type: 'SETUP_BACK' });
        }}
        nextTitle="Επόμενο"
        onNext={() => {
          dispatch({ type: 'SET_NAME', name: text });
          dispatch({ type: 'NAMES_NEXT' });
        }}
      />
    </ScreenPad>
  );
}

function SettingsView() {
  const { state, dispatch } = useGame();
  const [q, setQ] = useState(state.questionsPerRound);
  const [sec, setSec] = useState(state.secondsPerQuestion);
  const [rounds, setRounds] = useState<1 | 2 | 3>(state.totalRounds);
  return (
    <ScreenPad>
      <Text style={styles.title}>Ρυθμίσεις παιχνιδιού</Text>
      <Text style={styles.label}>Γύροι αγώνα (1–3)</Text>
      <View style={styles.row}>
        {([1, 2, 3] as const).map((r) => (
          <PrimaryButton
            key={r}
            title={String(r)}
            onPress={() => setRounds(r)}
            variant={rounds === r ? 'red' : 'blue'}
            style={styles.numBtn}
          />
        ))}
      </View>
      <Text style={styles.label}>Ερωτήσεις ανά γύρο: {q}</Text>
      <Slider
        style={styles.slider}
        minimumValue={1}
        maximumValue={10}
        step={1}
        value={q}
        onValueChange={(v) => setQ(Math.round(v))}
        minimumTrackTintColor={colors.blue}
        maximumTrackTintColor="#cbd5e1"
        thumbTintColor={colors.yellow}
      />
      <Text style={styles.label}>Χρόνος ανά ερώτηση: {sec} δευτ.</Text>
      <Slider
        style={styles.slider}
        minimumValue={0}
        maximumValue={180}
        step={1}
        value={sec}
        onValueChange={(v) => setSec(Math.round(v))}
        minimumTrackTintColor={colors.blue}
        maximumTrackTintColor="#cbd5e1"
        thumbTintColor={colors.yellow}
      />
      {state.errorMessage ? <Text style={styles.err}>{state.errorMessage}</Text> : null}
      <StepNavRow
        onBack={() => dispatch({ type: 'SETUP_BACK' })}
        nextTitle="Επόμενο"
        onNext={() => {
          dispatch({
            type: 'SET_SETTINGS',
            questionsPerRound: q,
            secondsPerQuestion: sec,
            totalRounds: rounds,
          });
        }}
      />
    </ScreenPad>
  );
}

function CategoryView() {
  const { state, dispatch } = useGame();
  const [cat, setCat] = useState(state.category);
  return (
    <ScrollView contentContainerStyle={styles.scrollPad}>
      <Text style={styles.title}>Επιλογή κατηγορίας</Text>
      {CATEGORY_OPTIONS.map((c) => (
        <PrimaryButton
          key={c}
          title={c}
          onPress={() => {
            setCat(c);
            dispatch({ type: 'SET_CATEGORY', category: c });
          }}
          variant={cat === c ? 'green' : 'blue'}
        />
      ))}
      {state.errorMessage ? <Text style={styles.err}>{state.errorMessage}</Text> : null}
      <StepNavRow
        onBack={() => dispatch({ type: 'SETUP_BACK' })}
        nextTitle="Έναρξη"
        onNext={() => {
          dispatch({ type: 'SET_CATEGORY', category: cat });
          dispatch({ type: 'START_GAME' });
        }}
      />
    </ScrollView>
  );
}

function CountdownView() {
  const { state, dispatch } = useGame();
  const [n, setN] = useState(3);
  const playerName = state.players[state.currentPlayerIndex]?.name?.trim() ?? '';
  useEffect(() => {
    if (n <= 0) {
      dispatch({ type: 'COUNTDOWN_FINISHED' });
      return;
    }
    const t = setTimeout(() => setN((x) => x - 1), 700);
    return () => clearTimeout(t);
  }, [n, dispatch]);
  return (
    <LinearGradient colors={['#FDE68A', colors.yellow]} style={styles.gradient}>
      <SafeAreaView style={styles.center}>
        {playerName.length > 0 ? (
          <Text style={styles.countdownPlayer}>{playerName}</Text>
        ) : null}
        <Text style={styles.countdownTitle}>Ξεκινάμε σε</Text>
        <Text style={styles.countdownNum}>{n > 0 ? n : '!'}</Text>
      </SafeAreaView>
    </LinearGradient>
  );
}

function QuestionView() {
  const { state, dispatch } = useGame();
  const q = state.currentDeck[state.questionIndexInSet];
  const player = state.players[state.currentPlayerIndex];
  const maxT = state.secondsPerQuestion;
  const [remain, setRemain] = useState(maxT);
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false);
  const timeUpSent = useRef(false);

  useEffect(() => {
    timeUpSent.current = false;
    if (maxT <= 0) {
      setRemain(0);
      return;
    }
    setRemain(maxT);
    const id = setInterval(() => {
      setRemain((r) => {
        if (r <= 1) {
          clearInterval(id);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [state.questionIndexInSet, maxT, state.currentPlayerIndex, state.round]);

  useEffect(() => {
    if (maxT <= 0 || remain > 0) return;
    if (timeUpSent.current) return;
    timeUpSent.current = true;
    dispatch({ type: 'TIME_UP' });
  }, [remain, maxT, dispatch]);

  if (!q || !player) return null;

  return (
    <SafeAreaView style={styles.gameArea}>
      <Modal
        visible={exitConfirmOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setExitConfirmOpen(false)}
      >
        <View style={styles.exitModalRoot}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setExitConfirmOpen(false)}
            accessibilityLabel="Άκυρο επιβεβαίωσης εξόδου"
          />
          <View style={styles.exitModalCard}>
            <Text style={styles.exitModalTitle}>Έξοδος</Text>
            <Text style={styles.exitModalMsg}>Να γίνει έξοδος από το παιχνίδι; Η πρόοδος του αγώνα θα χαθεί.</Text>
            <View style={styles.exitModalRow}>
              <PrimaryButton
                title="Άκυρο"
                onPress={() => setExitConfirmOpen(false)}
                variant="blue"
                style={styles.exitModalBtn}
              />
              <PrimaryButton
                title="Έξοδος"
                onPress={() => {
                  setExitConfirmOpen(false);
                  dispatch({ type: 'EXIT_TO_HOME' });
                }}
                variant="red"
                style={styles.exitModalBtn}
              />
            </View>
          </View>
        </View>
      </Modal>
      <View style={styles.gameHeader}>
        <View>
          <Text style={styles.meta}>
            {state.questionIndexInSet + 1}/{state.currentDeck.length}
          </Text>
          <Text style={styles.meta}>Γύρος {state.round}/{state.totalRounds}</Text>
          <Text style={styles.playerName}>{player.name}</Text>
        </View>
        {maxT > 0 ? (
          <View style={styles.timerRing}>
            <Text style={styles.timerText}>{remain}</Text>
          </View>
        ) : (
          <Text style={styles.noTimer}>Χωρίς χρονόμετρο</Text>
        )}
        <Pressable
          onPress={() => setExitConfirmOpen(true)}
          style={({ pressed }) => [styles.exitHit, pressed && styles.exitPressed]}
          accessibilityRole="button"
          accessibilityLabel="Έξοδος από το παιχνίδι"
        >
          <Text style={styles.exit}>Έξοδος</Text>
        </Pressable>
      </View>
      <Text style={styles.questionText}>{q.text}</Text>
      <QuestionBody
        q={q}
        onSubmit={(payload) => dispatch({ type: 'SUBMIT_ANSWER', payload })}
      />
    </SafeAreaView>
  );
}

function QuestionBody({
  q,
  onSubmit,
}: {
  q: NormalizedQuestion;
  onSubmit: (p: { choiceIndex?: number; trueFalseLabel?: 'Σωστό' | 'Λάθος' }) => void;
}) {
  if (q.kind === 'multiple') {
    return (
      <View style={styles.grid}>
        {q.options.map((opt, i) => (
          <PrimaryButton
            key={i}
            title={opt}
            onPress={() => {
              console.log('[Quizaki] user tap MC option', i);
              onSubmit({ choiceIndex: i as 0 | 1 | 2 | 3 });
            }}
            variant="blue"
            style={styles.gridBtn}
          />
        ))}
      </View>
    );
  }
  return (
    <View style={styles.tfRow}>
      <PrimaryButton title="Σωστό" onPress={() => onSubmit({ trueFalseLabel: 'Σωστό' })} variant="green" />
      <PrimaryButton title="Λάθος" onPress={() => onSubmit({ trueFalseLabel: 'Λάθος' })} variant="red" />
    </View>
  );
}

function FeedbackView() {
  const { state, dispatch } = useGame();
  const ok = state.lastAnswerCorrect === true;
  useEffect(() => {
    if (ok) fireCorrectAnswerConfetti();
  }, [ok]);
  return (
    <LinearGradient
      colors={ok ? ['#BBF7D0', colors.green] : ['#FECACA', colors.red]}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.center}>
        <Text style={styles.feedbackTitle}>{ok ? 'Σωστά!' : 'Λάθος'}</Text>
        {!ok && state.lastFeedbackDetail ? (
          <Text style={styles.feedbackSub}>{state.lastFeedbackDetail}</Text>
        ) : null}
        <PrimaryButton title="Συνέχεια" onPress={() => dispatch({ type: 'FEEDBACK_DONE' })} variant="yellow" />
      </SafeAreaView>
    </LinearGradient>
  );
}

function PlayerSetScoreView() {
  const { state, dispatch } = useGame();
  const p = state.players[state.currentPlayerIndex];
  const solo = state.playerCount === 1;
  const nextPlayerIndex = state.currentPlayerIndex + 1;
  const nextPlayer =
    nextPlayerIndex < state.playerCount ? state.players[nextPlayerIndex] : undefined;
  const multiContinueTitle =
    nextPlayer != null && nextPlayer.name.trim().length > 0
      ? `Τώρα παίζει ο ${nextPlayer.name.trim()}`
      : 'Κατάταξη γύρου';
  if (!p) return null;
  return (
    <ScreenPad contentStyle={styles.playerSetPad}>
      <Text style={styles.title}>{p.name}</Text>
      <Text style={styles.label}>Γύρος {state.round} που μόλις τελείωσε</Text>
      <Text style={styles.bigScore}>Συνολικό σκορ: {p.score}</Text>
      {state.errorMessage ? <Text style={styles.err}>{state.errorMessage}</Text> : null}
      <View style={styles.playerSetActions}>
        {solo ? (
          <>
            <PrimaryButton title="Παίξε ξανά" onPress={() => dispatch({ type: 'SOLO_PLAY_AGAIN' })} variant="blue" />
            <PrimaryButton
              title="Συνέχεια"
              onPress={() => dispatch({ type: 'PLAYER_SET_CONTINUE' })}
              variant="green"
            />
          </>
        ) : (
          <PrimaryButton
            title={multiContinueTitle}
            onPress={() => dispatch({ type: 'PLAYER_SET_CONTINUE' })}
            variant="yellow"
          />
        )}
      </View>
    </ScreenPad>
  );
}

function RoundSummaryView() {
  const { state, dispatch } = useGame();
  const sorted = [...state.players].sort((a, b) => b.score - a.score);
  return (
    <ScreenPad>
      <Text style={styles.title}>
        Κατάταξη — Γύρος {state.round}/{state.totalRounds}
      </Text>
      {sorted.map((pl, i) => {
        const isFirst = i === 0;
        const isLast = i === sorted.length - 1 && sorted.length > 1;
        return (
          <Text
            key={pl.id}
            style={[styles.rankLine, isFirst && styles.rankLineWinner, isLast && styles.rankLineLoser]}
          >
            {i + 1}. {pl.name} — σύνολο {pl.score}
          </Text>
        );
      })}
      {state.errorMessage ? <Text style={styles.err}>{state.errorMessage}</Text> : null}
      <PrimaryButton
        title={state.round >= state.totalRounds ? 'Τελικά αποτελέσματα' : 'Επόμενος γύρος'}
        onPress={() => dispatch({ type: 'ROUND_SUMMARY_CONTINUE' })}
        variant="yellow"
      />
    </ScreenPad>
  );
}

function FinalView() {
  const { state, dispatch } = useGame();
  const sorted = [...state.players].sort((a, b) => b.score - a.score);
  const maxScore = sorted[0]?.score ?? 0;
  const tie =
    maxScore > 0 && sorted.filter((p) => p.score === maxScore).length > 1;
  return (
    <ScreenPad>
      <Text style={styles.title}>{tie ? 'Ισοπαλία!' : `Νικητής: ${sorted[0]?.name ?? ''}`}</Text>
      {sorted.map((pl, i) => {
        const isFirst = i === 0;
        const isLast = i === sorted.length - 1 && sorted.length > 1;
        return (
          <Text
            key={pl.id}
            style={[styles.rankLine, isFirst && styles.rankLineWinner, isLast && styles.rankLineLoser]}
          >
            {pl.name}: σύνολο {pl.score}
          </Text>
        );
      })}
      <PrimaryButton title="Παίξτε ρεβανς" onPress={() => dispatch({ type: 'FINAL_REMATCH' })} variant="yellow" />
      <PrimaryButton title="Αρχική" onPress={() => dispatch({ type: 'EXIT_TO_HOME' })} variant="blue" />
    </ScreenPad>
  );
}

function ScreenPad({
  children,
  contentStyle,
}: {
  children: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  return (
    <ScrollView
      contentContainerStyle={[styles.scrollPad, contentStyle]}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  splashRoot: { flex: 1, width: '100%', minHeight: '100%' },
  splashSafe: { flex: 1, justifyContent: 'flex-end' },
  splashFooter: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    paddingTop: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  gameArea: { flex: 1, padding: spacing.md, backgroundColor: colors.questionScreenBg },
  scrollPad: { padding: spacing.lg, paddingBottom: 48 },
  playerSetPad: {
    flexGrow: 1,
    paddingBottom: spacing.xl,
  },
  playerSetActions: {
    marginTop: spacing.md,
    zIndex: 10,
    ...(Platform.OS === 'web' ? ({ position: 'relative' as const } as const) : {}),
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    marginBottom: spacing.md,
    color: colors.text,
    textAlign: 'center',
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  stepNavRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  stepNavBtn: { flex: 1, marginVertical: spacing.sm },
  numBtn: { minWidth: 64, margin: spacing.xs },
  input: {
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radii.button,
    padding: spacing.md,
    fontSize: 18,
    marginBottom: spacing.md,
    backgroundColor: colors.card,
    color: colors.text,
  },
  label: { fontSize: 14, fontWeight: '600', marginBottom: spacing.xs, color: colors.muted },
  slider: { width: '100%', height: 44, marginBottom: spacing.lg },
  err: { color: colors.red, marginBottom: spacing.sm, textAlign: 'center' },
  meta: { fontSize: 14, fontWeight: '700', color: colors.muted },
  playerName: { fontSize: 18, fontWeight: '800', color: colors.text },
  gameHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  timerRing: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 4,
    borderColor: colors.border,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerText: { fontSize: 20, fontWeight: '900' },
  noTimer: { fontSize: 12, maxWidth: 80, color: colors.muted },
  exitHit: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    marginLeft: spacing.xs,
    ...(Platform.OS === 'web'
      ? ({ cursor: 'pointer', userSelect: 'none' } as const)
      : ({} as const)),
  },
  exitPressed: { opacity: 0.7 },
  exit: { fontWeight: '800', color: colors.red },
  exitModalRoot: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    padding: spacing.lg,
  },
  exitModalCard: {
    zIndex: 1,
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.card,
    borderRadius: radii.card,
    borderWidth: 3,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  exitModalTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  exitModalMsg: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.muted,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  exitModalRow: { flexDirection: 'row', gap: spacing.md },
  exitModalBtn: { flex: 1, marginVertical: 0 },
  questionText: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: spacing.lg,
    color: colors.text,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  gridBtn: { width: '48%' },
  tfRow: { gap: spacing.md },
  countdownPlayer: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: spacing.sm,
    textAlign: 'center',
    color: colors.text,
  },
  countdownTitle: { fontSize: 24, fontWeight: '800', marginBottom: spacing.md },
  countdownNum: { fontSize: 72, fontWeight: '900', color: colors.red },
  feedbackTitle: { fontSize: 36, fontWeight: '900', marginBottom: spacing.md },
  feedbackSub: { fontSize: 16, textAlign: 'center', marginBottom: spacing.lg, paddingHorizontal: spacing.md },
  bigScore: { fontSize: 56, fontWeight: '900', textAlign: 'center', marginVertical: spacing.md },
  rankLine: { fontSize: 18, marginVertical: spacing.xs, fontWeight: '600' },
  /** 1η θέση — πράσινο φόντο */
  rankLineWinner: {
    backgroundColor: '#DCFCE7',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.card,
    overflow: 'hidden',
  },
  /** Τελευταία θέση — κόκκινο φόντο */
  rankLineLoser: {
    backgroundColor: '#FEE2E2',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.card,
    overflow: 'hidden',
  },
});
