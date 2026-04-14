import { useEffect } from 'react';
import { SignalFlow } from '../SignalFlow/SignalFlow';
import './HelpModal.css';

function Section({ title, children }) {
  return (
    <section className="help-section">
      <h2 className="help-section-title">{title}</h2>
      <dl className="help-dl">{children}</dl>
    </section>
  );
}

function Row({ term, children }) {
  return (
    <>
      <dt>{term}</dt>
      <dd>{children}</dd>
    </>
  );
}

export function HelpModal({ onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="help-overlay" onPointerDown={onClose}>
      <div className="help-modal" onPointerDown={e => e.stopPropagation()}>

        <div className="help-modal-header">
          <span className="help-modal-title">◈ SYNTH — ヘルプ</span>
          <button className="help-close-btn" onClick={onClose}>×</button>
        </div>

        <div className="help-modal-body">

          <section className="help-section">
            <h2 className="help-section-title">シグナルフロー — Signal Flow</h2>
            <div className="help-signal-flow">
              <SignalFlow />
            </div>
            <div className="help-flow-legend">
              <span className="help-legend-item help-legend-audio">─── Audio Path</span>
              <span className="help-legend-item help-legend-mod">- - - Modulation (LFO)</span>
              <span className="help-legend-item help-legend-ctrl">· · · Note Trigger</span>
            </div>
          </section>

          <Section title="OSC 1 / OSC 2 — オシレーター">
            <Row term="Wave">波形の選択（∿ サイン / △ 三角 / / ノコギリ / ⊓ 矩形）</Row>
            <Row term="Oct">オクターブ移調（−2〜+2）</Row>
            <Row term="Detune">ピッチの微調整（±100セント）</Row>
            <Row term="Vol">このオシレーターの音量</Row>
            <Row term="Semi">OSC 2のみ。半音単位でのピッチシフト（0〜24）</Row>
            <Row term="IMG">画像ファイルをウェーブテーブルとして読み込む。明度データをDFTで波形に変換し、画像を上から下に8フレームに分割して奥行き方向に並べる</Row>
            <Row term="Pos">ウェーブテーブルの再生フレーム位置（0=先頭フレーム, 1=最終フレーム）</Row>
            <Row term="LFO（WT）">LFOによるフレーム位置スキャンの深度</Row>
            <Row term="Rate（WT）">ウェーブテーブルスキャンLFOの速度（Hz）</Row>
            <Row term="Env（WT）">エンベロープによるフレーム位置変調量。正値で前進、負値で後退</Row>
          </Section>

          <Section title="OSC 3 — ノイズ">
            <Row term="W / P / B">ホワイト・ピンク・ブラウンノイズの切り替え</Row>
            <Row term="Vol">ノイズの音量</Row>
          </Section>

          <Section title="Unison — ユニゾン">
            <Row term="Voices">重ねる声部数（1 / 2 / 3 / 4 / 7）</Row>
            <Row term="Spread">各声部間のデチューン幅（セント）</Row>
            <Row term="Width">ステレオパンの広がり（0=モノ, 1=最大）</Row>
          </Section>

          <Section title="Filter — フィルター">
            <Row term="タイプ">LP（ローパス）/ HP（ハイパス）/ BP（バンドパス）/ Notch</Row>
            <Row term="Cutoff">カットオフ周波数。LFOの変調先にも設定可</Row>
            <Row term="Q">レゾナンス。カットオフ付近を強調する量</Row>
            <Row term="Roll">フィルタースロープ（-12 / -24 / -48 dB/oct）</Row>
          </Section>

          <Section title="Envelope — エンベロープ（ADSR）">
            <Row term="Attack">ノートオン後、音量が最大に達するまでの時間</Row>
            <Row term="Decay">最大音量からサステインレベルに下がるまでの時間</Row>
            <Row term="Sustain">鍵盤を押し続けている間の音量レベル（0〜1）</Row>
            <Row term="Release">鍵盤を離した後、音が消えるまでの時間</Row>
          </Section>

          <Section title="LFO — 低周波発振器">
            <Row term="Wave">LFO波形（サイン / 三角 / ノコギリ / 矩形）</Row>
            <Row term="Rate">LFOの速度（Hz）</Row>
            <Row term="Depth">変調の深さ</Row>
            <Row term="Dest">変調先（Filter カットオフ / Pitch ピッチ / Volume 音量）</Row>
            <Row term="Pol">変調の向き（+ 上方向のみ / ± 両方向 / − 下方向のみ）</Row>
          </Section>

          <Section title="Effects — エフェクト">
            <Row term="Chorus">コーラス。Rate（変調速度）/ Depth（深さ）/ Wet（ミックス量）</Row>
            <Row term="Delay">ディレイ。Time（遅延時間）/ FB（フィードバック）/ Wet</Row>
            <Row term="Reverb">リバーブ。Decay（残響時間）/ Tone（音色）/ Wet</Row>
          </Section>

          <Section title="Amp — アンプ">
            <Row term="Volume">マスター出力音量</Row>
          </Section>

          <Section title="Sequencer — ステップシーケンサー">
            <Row term="▶ / ■">再生 / 停止</Row>
            <Row term="BPM">テンポ（40〜240 BPM）</Row>
            <Row term="Steps">ステップ数（8 / 16 / 32）</Row>
            <Row term="Root / Scale">ルートノートとスケール。ノート選択時の候補音が変わる</Row>
            <Row term="タップ">ステップのオン / オフ</Row>
            <Row term="長押し・右クリック・✎">ノートピッカーを開く。スケール内のノートを選択可能</Row>
            <Row term="PRESETS">シーケンスパターンの保存・読み込み。↺ で現在のプリセットを上書き</Row>
          </Section>

          <Section title="Keyboard — 鍵盤">
            <Row term="クリック / タッチ">鍵盤をクリックまたはタッチして演奏</Row>
            <Row term="PCキーボード">以下のキーでリアルタイム演奏が可能</Row>
            <dt className="help-keyboard-label">白鍵（C3〜E4）</dt>
            <dd><code className="help-key-row">A S D F G H J K L ;</code></dd>
            <dt className="help-keyboard-label">黒鍵（C#3〜D#4）</dt>
            <dd><code className="help-key-row">W E &nbsp; T Y U &nbsp; O P</code></dd>
          </Section>

        </div>
      </div>
    </div>
  );
}
