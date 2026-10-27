import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Cloud, Key, Cpu, Network } from "../icons";
import { useSettingsStore } from "../../stores/settingsStore";
import { usePolicyModeOptions, usePolicySnapshot } from "../../hooks/usePolicy";
import { isModeAllowedByPolicy } from "../../stores/policyRules";
import { requestSignIn } from "../../utils/requestSignIn";
import { Button } from "../ui/button";
import { InferenceModeSelector, SettingsRow } from "../ui/SettingsSection";
import type { InferenceModeOption } from "../ui/SettingsSection";
import { Toggle } from "../ui/toggle";
import TranscriptionModelPicker from "../TranscriptionModelPicker";
import type { InferenceMode } from "../../types/electron";
import { getMeetingStreamingTranscriptionProviders } from "../../models/ModelRegistry";

const MEETING_BYOK_PROVIDER_IDS = getMeetingStreamingTranscriptionProviders().map(
  (provider) => provider.id
);

export function MeetingSpeakerDetectionRow() {
  const { t } = useTranslation();
  const speakerDiarizationEnabled = useSettingsStore((s) => s.speakerDiarizationEnabled);
  const setSpeakerDiarizationEnabled = useSettingsStore((s) => s.setSpeakerDiarizationEnabled);

  return (
    <SettingsRow
      label={t("settings.meeting.speakerDetection.title")}
      description={t("settings.meeting.speakerDetection.description")}
    >
      <Toggle checked={speakerDiarizationEnabled} onChange={setSpeakerDiarizationEnabled} />
    </SettingsRow>
  );
}

function MeetingEchoCancellationRow() {
  const { t } = useTranslation();
  const meetingAecEnabled = useSettingsStore((s) => s.meetingAecEnabled);
  const setMeetingAecEnabled = useSettingsStore((s) => s.setMeetingAecEnabled);

  return (
    <SettingsRow
      label={t("settingsPage.transcription.aec.toggle.title")}
      description={t("settingsPage.transcription.aec.toggle.description")}
    >
      <Toggle checked={meetingAecEnabled} onChange={setMeetingAecEnabled} />
    </SettingsRow>
  );
}


function MeetingOutputDeviceRow() {
  const [devices, setDevices] = useState<Array<{id: string; name: string; isDefault: boolean}>>([]);
  const [selected, setSelected] = useState(
    () => localStorage.getItem("meetingOutputDeviceId") || ""
  );
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    try {
      const found = await window.electronAPI?.listWindowsOutputDevices?.();
      setDevices(found || []);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    if (navigator.platform.startsWith("Win")) void refresh();
  }, [refresh]);
  if (!navigator.platform.startsWith("Win")) return null;
  const setOutput = (value: string) => {
    localStorage.setItem("meetingOutputDeviceId", value);
    setSelected(value);
  };
  return (
    <SettingsRow
      label="Meeting audio output"
      description="Select the Windows speakers or headphones playing Teams audio. Automatic preserves original behavior. Changes take effect on the next recording."
    >
      <div className="flex flex-col gap-2 min-w-52">
        <select
          className="rounded-md border border-input bg-background px-2 py-2 text-sm"
          value={selected}
          onChange={(event) => setOutput(event.target.value)}
          aria-label="Meeting output device"
        >
          <option value="">Automatic (original behavior)</option>
          {devices.map((device) => (
            <option key={device.id} value={device.id}>
              {device.name}{device.isDefault ? " (Windows default)" : ""}
            </option>
          ))}
          {selected && !devices.some((device) => device.id === selected) && (
            <option value={selected}>Previously selected device (unavailable)</option>
          )}
        </select>
        <Button variant="outline" size="sm" onClick={() => void refresh()}>Refresh devices</Button>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    </SettingsRow>
  );
}

const noop = () => {};

export function MeetingTranscriptionPanel() {
  const { t } = useTranslation();
  const policySnapshot = usePolicySnapshot();

  const {
    isSignedIn,
    meetingTranscriptionMode,
    setMeetingTranscriptionMode,
    setMeetingUseLocalWhisper,
    meetingWhisperModel,
    setMeetingWhisperModel,
    meetingLocalTranscriptionProvider,
    setMeetingLocalTranscriptionProvider,
    meetingParakeetModel,
    setMeetingParakeetModel,
    meetingCohereModel,
    setMeetingCohereModel,
    meetingCloudTranscriptionProvider,
    setMeetingCloudTranscriptionProvider,
    meetingCloudTranscriptionModel,
    setMeetingCloudTranscriptionModel,
    meetingCloudTranscriptionBaseUrl,
    setMeetingCloudTranscriptionBaseUrl,
    setMeetingCloudTranscriptionMode,
  } = useSettingsStore();
  const {
    modes: transcriptionModes,
    effectiveMode: effectiveTranscriptionMode,
    isModeAllowed,
  } = usePolicyModeOptions<InferenceModeOption>(
    [
      {
        id: "openwhispr",
        label: t("settingsPage.transcription.modes.openwhispr"),
        description: t("settingsPage.transcription.modes.openwhisprDesc"),
        icon: <Cloud className="w-4 h-4" />,
        disabled: !isSignedIn,
        signInRequired: !isSignedIn,
      },
      {
        id: "providers",
        label: t("settingsPage.transcription.modes.providers"),
        description: t("settingsPage.transcription.modes.providersDesc"),
        icon: <Key className="w-4 h-4" />,
      },
      {
        id: "local",
        label: t("settingsPage.transcription.modes.local"),
        description: t("settingsPage.transcription.modes.localDesc"),
        icon: <Cpu className="w-4 h-4" />,
      },
      {
        id: "self-hosted",
        label: t("settingsPage.transcription.modes.selfHosted"),
        description: t("settingsPage.transcription.modes.selfHostedDesc"),
        icon: <Network className="w-4 h-4" />,
        disabled: true,
        badge: t("common.comingSoon"),
      },
    ],
    "transcription",
    meetingTranscriptionMode,
    { byokProviders: MEETING_BYOK_PROVIDER_IDS }
  );
  const handleTranscriptionModeSelect = (mode: InferenceMode) => {
    if (!isModeAllowed(mode)) return;
    if (mode === "self-hosted") return;
    if (mode === "openwhispr" && !isSignedIn) {
      requestSignIn();
      return;
    }
    if (mode === effectiveTranscriptionMode) return;
    setMeetingTranscriptionMode(mode);
    setMeetingUseLocalWhisper(mode === "local");
    setMeetingCloudTranscriptionMode(mode === "openwhispr" ? "openwhispr" : "byok");
  };

  const handleLocalTranscriptionModelSelect = useCallback(
    (modelId: string, providerId?: string) => {
      const provider = providerId ?? meetingLocalTranscriptionProvider;
      if (provider === "nvidia") {
        setMeetingParakeetModel(modelId);
      } else if (provider === "cohere") {
        setMeetingCohereModel(modelId);
      } else {
        setMeetingWhisperModel(modelId);
      }
    },
    [
      meetingLocalTranscriptionProvider,
      setMeetingParakeetModel,
      setMeetingCohereModel,
      setMeetingWhisperModel,
    ]
  );

  const renderTranscriptionPicker = (mode: "cloud" | "local") => (
    <TranscriptionModelPicker
      streamingOnly
      transcriptionContext="meeting"
      selectedCloudProvider={meetingCloudTranscriptionProvider}
      onCloudProviderSelect={setMeetingCloudTranscriptionProvider}
      selectedCloudModel={meetingCloudTranscriptionModel}
      onCloudModelSelect={setMeetingCloudTranscriptionModel}
      selectedLocalModel={
        meetingLocalTranscriptionProvider === "nvidia"
          ? meetingParakeetModel
          : meetingLocalTranscriptionProvider === "cohere"
            ? meetingCohereModel
            : meetingWhisperModel
      }
      onLocalModelSelect={handleLocalTranscriptionModelSelect}
      selectedLocalProvider={meetingLocalTranscriptionProvider}
      onLocalProviderSelect={setMeetingLocalTranscriptionProvider}
      useLocalWhisper={mode === "local"}
      onModeChange={noop}
      mode={mode}
      cloudTranscriptionBaseUrl={meetingCloudTranscriptionBaseUrl}
      setCloudTranscriptionBaseUrl={setMeetingCloudTranscriptionBaseUrl}
      variant="settings"
    />
  );

  // Only true when the org's policy actually allows the enterprise
  // transcription mode — an empty list can also mean e.g. a self-hosted-only
  // policy, where this specific explanation would be false.
  const emptyListIsEnterpriseOnly =
    transcriptionModes.length === 0 &&
    isModeAllowedByPolicy(policySnapshot, "transcription", "enterprise");

  return (
    <div className="space-y-3">
      {emptyListIsEnterpriseOnly && (
        <p className="text-sm text-muted-foreground">
          {t("settingsPage.transcription.meetingEnterpriseOnly")}
        </p>
      )}
      <InferenceModeSelector
        modes={transcriptionModes}
        activeMode={effectiveTranscriptionMode}
        onSelect={handleTranscriptionModeSelect}
      />

      {effectiveTranscriptionMode === "openwhispr" && !isSignedIn && (
        <p className="text-sm text-muted-foreground">
          {t("settingsPage.transcription.meetingCloudSignedOut")}{" "}
          <Button variant="link" className="h-auto p-0" onClick={requestSignIn}>
            {t("common.signIn")}
          </Button>
        </p>
      )}
      {effectiveTranscriptionMode === "providers" && renderTranscriptionPicker("cloud")}
      {effectiveTranscriptionMode === "local" && renderTranscriptionPicker("local")}
      <MeetingOutputDeviceRow />
      <MeetingSpeakerDetectionRow />
      <MeetingEchoCancellationRow />
    </div>
  );
}
