/* Selected Windows render-endpoint recording.
 * Included after the shared WASAPI GUIDs, format constants, and helpers. */
#include <functiondiscoverykeys_devpkey.h>
#include <propsys.h>

static void print_json_wide(const WCHAR *value)
{
    int len, i;
    char *utf8;
    if (!value) return;
    len = WideCharToMultiByte(CP_UTF8, 0, value, -1, NULL, 0, NULL, NULL);
    if (len <= 0) return;
    utf8 = (char *)malloc((size_t)len);
    if (!utf8) return;
    if (!WideCharToMultiByte(CP_UTF8, 0, value, -1, utf8, len, NULL, NULL)) {
        free(utf8);
        return;
    }
    for (i = 0; i < len - 1; i++) {
        unsigned char c = (unsigned char)utf8[i];
        if (c == '"' || c == '\\') {
            fputc('\\', stdout);
            fputc(c, stdout);
        } else if (c < 32) {
            fprintf(stdout, "\\u%04x", c);
        } else {
            fputc(c, stdout);
        }
    }
    free(utf8);
}

static int run_list_devices(void)
{
    IMMDeviceEnumerator *enumerator = NULL;
    IMMDeviceCollection *devices = NULL;
    IMMDevice *defaultDevice = NULL;
    LPWSTR defaultId = NULL;
    HRESULT hr;
    UINT count = 0, i;
    BOOL first = TRUE;

    hr = CoCreateInstance(&HELPER_CLSID_MMDeviceEnumerator, NULL, CLSCTX_ALL,
                          &HELPER_IID_IMMDeviceEnumerator, (void **)&enumerator);
    if (FAILED(hr)) return 2;
    hr = IMMDeviceEnumerator_EnumAudioEndpoints(enumerator, eRender,
                                                DEVICE_STATE_ACTIVE, &devices);
    if (FAILED(hr)) {
        IMMDeviceEnumerator_Release(enumerator);
        return 2;
    }
    if (SUCCEEDED(IMMDeviceEnumerator_GetDefaultAudioEndpoint(
            enumerator, eRender, eMultimedia, &defaultDevice))) {
        IMMDevice_GetId(defaultDevice, &defaultId);
        IMMDevice_Release(defaultDevice);
    }
    IMMDeviceCollection_GetCount(devices, &count);
    fputs("{\"devices\":[", stdout);
    for (i = 0; i < count; i++) {
        IMMDevice *device = NULL;
        IPropertyStore *properties = NULL;
        LPWSTR id = NULL;
        PROPVARIANT friendlyName;
        BOOL isDefault;
        PropVariantInit(&friendlyName);
        if (FAILED(IMMDeviceCollection_Item(devices, i, &device))) continue;
        if (FAILED(IMMDevice_GetId(device, &id))) {
            IMMDevice_Release(device);
            continue;
        }
        isDefault = defaultId && wcscmp(id, defaultId) == 0;
        if (!first) fputc(',', stdout);
        first = FALSE;
        fputs("{\"id\":\"", stdout);
        print_json_wide(id);
        fputs("\",\"name\":\"", stdout);
        if (SUCCEEDED(IMMDevice_OpenPropertyStore(device, STGM_READ, &properties))) {
            if (SUCCEEDED(IPropertyStore_GetValue(properties, &PKEY_Device_FriendlyName,
                                                   &friendlyName)) &&
                friendlyName.vt == VT_LPWSTR && friendlyName.pwszVal) {
                print_json_wide(friendlyName.pwszVal);
            } else {
                print_json_wide(id);
            }
            PropVariantClear(&friendlyName);
            IPropertyStore_Release(properties);
        } else {
            print_json_wide(id);
        }
        fprintf(stdout, "\",\"isDefault\":%s}", isDefault ? "true" : "false");
        CoTaskMemFree(id);
        IMMDevice_Release(device);
    }
    fputs("]}\n", stdout);
    fflush(stdout);
    if (defaultId) CoTaskMemFree(defaultId);
    IMMDeviceCollection_Release(devices);
    IMMDeviceEnumerator_Release(enumerator);
    return 0;
}

/* Shared WASAPI endpoint loopback, outputting 24 kHz 16-bit stereo PCM
 * for the existing downmix/transcription pipeline. */
static HRESULT activate_endpoint_loopback(
    const WCHAR *deviceId, UINT32 sampleRate, IAudioClient **outClient,
    const char **outErrorCode)
{
    IMMDeviceEnumerator *enumerator = NULL;
    IMMDevice *device = NULL;
    IAudioClient *audioClient = NULL;
    WAVEFORMATEX format;
    HRESULT hr;
    *outClient = NULL;
    *outErrorCode = "endpoint_not_found";
    hr = CoCreateInstance(&HELPER_CLSID_MMDeviceEnumerator, NULL, CLSCTX_ALL,
                          &HELPER_IID_IMMDeviceEnumerator, (void **)&enumerator);
    if (FAILED(hr)) return hr;
    hr = IMMDeviceEnumerator_GetDevice(enumerator, deviceId, &device);
    IMMDeviceEnumerator_Release(enumerator);
    if (FAILED(hr)) return hr;
    hr = IMMDevice_Activate(device, &IID_IAudioClient, CLSCTX_ALL, NULL,
                            (void **)&audioClient);
    IMMDevice_Release(device);
    if (FAILED(hr)) {
        *outErrorCode = "endpoint_activation_failed";
        return hr;
    }
    ZeroMemory(&format, sizeof(format));
    format.wFormatTag = WAVE_FORMAT_PCM;
    format.nChannels = CAPTURE_CHANNELS;
    format.nSamplesPerSec = sampleRate;
    format.wBitsPerSample = BYTES_PER_SAMPLE * 8;
    format.nBlockAlign = CAPTURE_CHANNELS * BYTES_PER_SAMPLE;
    format.nAvgBytesPerSec = sampleRate * format.nBlockAlign;
    hr = IAudioClient_Initialize(
        audioClient, AUDCLNT_SHAREMODE_SHARED,
        AUDCLNT_STREAMFLAGS_LOOPBACK | AUDCLNT_STREAMFLAGS_EVENTCALLBACK |
            AUDCLNT_STREAMFLAGS_AUTOCONVERTPCM | AUDCLNT_STREAMFLAGS_SRC_DEFAULT_QUALITY,
        BUFFER_DURATION_HNS, 0, &format, NULL);
    if (FAILED(hr)) {
        *outErrorCode = "endpoint_initialize_failed";
        IAudioClient_Release(audioClient);
        return hr;
    }
    *outClient = audioClient;
    return S_OK;
}
