package com.SafeCommunityAI.backend.service.impl;

import com.SafeCommunityAI.backend.dto.AttachmentRequest;
import com.SafeCommunityAI.backend.dto.IncidentRequest;
import com.SafeCommunityAI.backend.enums.IncidentType;
import com.SafeCommunityAI.backend.enums.PriorityLevel;
import com.SafeCommunityAI.backend.service.AiTriageService;
import com.SafeCommunityAI.backend.service.TriageResult;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class LocalMlTriageService implements AiTriageService {
    private static final String SOURCE_LOCAL_ML = "LOCAL_ML";
    private static final String MODEL_NAME = "local-naive-bayes-v1";
    private static final Pattern TOKEN_PATTERN = Pattern.compile("[a-z0-9]{3,}");
    private static final Set<String> STOP_WORDS = Set.of(
            "and", "the", "for", "with", "from", "near", "have", "has", "this", "that", "there", "please",
            "help", "need", "needs", "incident", "emergency", "location", "reported", "report"
    );
    private static final List<String> CRITICAL_TERMS = List.of(
            "unconscious", "not breathing", "breathing", "cardiac", "stroke", "bleeding", "weapon", "gun",
            "knife", "trapped", "explosion", "exploded", "collapse", "collapsed", "severe burns", "critical"
    );

    private final Map<PriorityLevel, Map<String, Integer>> tokenCounts = new EnumMap<>(PriorityLevel.class);
    private final Map<PriorityLevel, Integer> classDocumentCounts = new EnumMap<>(PriorityLevel.class);
    private final Map<PriorityLevel, Integer> totalTokenCounts = new EnumMap<>(PriorityLevel.class);
    private final Set<String> vocabulary = new HashSet<>();
    private final int trainingExampleCount;

    public LocalMlTriageService() {
        for (PriorityLevel level : PriorityLevel.values()) {
            tokenCounts.put(level, new HashMap<>());
            classDocumentCounts.put(level, 0);
            totalTokenCounts.put(level, 0);
        }
        List<TrainingExample> examples = trainingExamples();
        examples.forEach(this::train);
        trainingExampleCount = examples.size();
    }

    @Override
    public TriageResult analyze(IncidentRequest request, TriageResult fallback) {
        List<String> features = featuresFor(request);
        Map<PriorityLevel, Double> probabilities = probabilities(features);
        PriorityLevel mlLevel = probabilities.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey)
                .orElse(fallback.level());
        double confidence = probabilities.getOrDefault(mlLevel, 0.25);
        int mlScore = scoreFor(mlLevel, confidence);
        int blendedScore = Math.round((mlScore * 0.72f) + (fallback.score() * 0.28f));
        blendedScore = Math.max(blendedScore, criticalKeywordFloor(request));
        PriorityLevel finalLevel = levelFor(blendedScore);
        String explanation = explanationFor(request, finalLevel, confidence, topSignals(features), fallback);
        return new TriageResult(
                blendedScore,
                finalLevel,
                clamp(confidence, 0.52, 0.97),
                explanation,
                resourceSuggestion(request.type(), finalLevel),
                SOURCE_LOCAL_ML,
                MODEL_NAME,
                null
        );
    }

    private void train(TrainingExample example) {
        List<String> features = featuresFor(example.type(), example.severity(), example.description(), example.hasGps(), example.hasWitness(), example.attachmentCount());
        classDocumentCounts.compute(example.priority(), (level, count) -> count == null ? 1 : count + 1);
        Map<String, Integer> counts = tokenCounts.get(example.priority());
        for (String feature : features) {
            counts.merge(feature, 1, Integer::sum);
            vocabulary.add(feature);
            totalTokenCounts.compute(example.priority(), (level, count) -> count == null ? 1 : count + 1);
        }
    }

    private Map<PriorityLevel, Double> probabilities(List<String> features) {
        Map<PriorityLevel, Double> logScores = new EnumMap<>(PriorityLevel.class);
        int vocabularySize = Math.max(vocabulary.size(), 1);
        for (PriorityLevel level : PriorityLevel.values()) {
            double prior = (classDocumentCounts.get(level) + 1.0) / (trainingExampleCount + PriorityLevel.values().length);
            double logScore = Math.log(prior);
            int classTokenTotal = totalTokenCounts.get(level) + vocabularySize;
            Map<String, Integer> counts = tokenCounts.get(level);
            for (String feature : features) {
                int count = counts.getOrDefault(feature, 0) + 1;
                logScore += Math.log((double) count / classTokenTotal);
            }
            logScores.put(level, logScore);
        }
        double maxLog = logScores.values().stream().max(Double::compareTo).orElse(0.0);
        Map<PriorityLevel, Double> probabilities = new EnumMap<>(PriorityLevel.class);
        double total = 0;
        for (Map.Entry<PriorityLevel, Double> entry : logScores.entrySet()) {
            double value = Math.exp(entry.getValue() - maxLog);
            probabilities.put(entry.getKey(), value);
            total += value;
        }
        for (PriorityLevel level : PriorityLevel.values()) {
            probabilities.put(level, probabilities.get(level) / Math.max(total, 0.000001));
        }
        return probabilities;
    }

    private List<String> featuresFor(IncidentRequest request) {
        return featuresFor(
                request.type(),
                request.severity(),
                request.description(),
                request.latitude() != null && request.longitude() != null,
                hasText(request.witnessName()),
                request.attachments() == null ? 0 : request.attachments().stream().filter(this::hasAttachmentName).toList().size()
        );
    }

    private List<String> featuresFor(IncidentType type, String severity, String description, boolean hasGps, boolean hasWitness, int attachmentCount) {
        List<String> features = new ArrayList<>();
        features.add("type_" + type.name().toLowerCase(Locale.ROOT));
        if (hasText(severity)) {
            features.add("severity_" + severity.trim().toLowerCase(Locale.ROOT));
        }
        if (hasGps) {
            features.add("has_gps");
        }
        if (hasWitness) {
            features.add("has_witness");
        }
        if (attachmentCount > 0) {
            features.add("has_evidence");
        }
        tokenize(severity + " " + description).forEach(features::add);
        return features;
    }

    private List<String> tokenize(String text) {
        List<String> tokens = new ArrayList<>();
        Matcher matcher = TOKEN_PATTERN.matcher(text == null ? "" : text.toLowerCase(Locale.ROOT));
        while (matcher.find()) {
            String token = matcher.group();
            if (!STOP_WORDS.contains(token)) {
                tokens.add(token);
            }
        }
        return tokens;
    }

    private boolean hasAttachmentName(AttachmentRequest attachment) {
        return attachment != null && hasText(attachment.fileName());
    }

    private int scoreFor(PriorityLevel level, double confidence) {
        int base = switch (level) {
            case CRITICAL -> 92;
            case HIGH -> 76;
            case MEDIUM -> 56;
            case LOW -> 30;
        };
        int adjustment = (int) Math.round((confidence - 0.5) * 16);
        return clamp(base + adjustment, 0, 100);
    }

    private PriorityLevel levelFor(int score) {
        if (score >= 90) return PriorityLevel.CRITICAL;
        if (score >= 70) return PriorityLevel.HIGH;
        if (score >= 45) return PriorityLevel.MEDIUM;
        return PriorityLevel.LOW;
    }

    private int criticalKeywordFloor(IncidentRequest request) {
        String text = ((request.severity() == null ? "" : request.severity()) + " " + (request.description() == null ? "" : request.description())).toLowerCase(Locale.ROOT);
        boolean criticalTerm = CRITICAL_TERMS.stream().anyMatch(text::contains);
        if (criticalTerm && (request.type() == IncidentType.MEDICAL || request.type() == IncidentType.FIRE || request.type() == IncidentType.CRIME || request.type() == IncidentType.ACCIDENT)) {
            return 90;
        }
        if (criticalTerm) {
            return 75;
        }
        return 0;
    }

    private String explanationFor(IncidentRequest request, PriorityLevel level, double confidence, List<String> signals, TriageResult fallback) {
        String joinedSignals = signals.isEmpty() ? "incident category and severity" : String.join(", ", signals);
        return "Local ML classifier assigned " + level.name() + " priority using " + trainingExampleCount
                + " built-in emergency examples. Strongest signals: " + joinedSignals
                + ". Confidence " + Math.round(confidence * 100) + "%. Safety rule baseline was "
                + fallback.level().name() + " (" + fallback.score() + "/100).";
    }

    private List<String> topSignals(List<String> features) {
        return features.stream()
                .filter(feature -> !feature.startsWith("severity_") || !feature.equals("severity_high"))
                .filter(feature -> !feature.equals("has_gps"))
                .distinct()
                .sorted(Comparator.comparingInt(String::length).reversed())
                .limit(4)
                .map(feature -> feature.replace("type_", "type ").replace("severity_", "severity ").replace('_', ' '))
                .toList();
    }

    private String resourceSuggestion(IncidentType type, PriorityLevel level) {
        if (level == PriorityLevel.CRITICAL) {
            return switch (type) {
                case MEDICAL -> "Immediate ambulance dispatch and nearest hospital pre-alert";
                case FIRE -> "Fire unit, ambulance standby, and evacuation support";
                case ACCIDENT -> "Ambulance, traffic control, and rescue support";
                case CRIME -> "Police response with responder safety check";
                case NATURAL_DISASTER -> "Multi-agency response team and shelter coordination";
                case OTHER -> "Immediate dispatcher review and nearest available responder";
            };
        }
        return switch (type) {
            case MEDICAL -> "Ambulance and nearest hospital handoff";
            case FIRE -> "Fire unit and ambulance standby";
            case ACCIDENT -> "Ambulance plus traffic or police support";
            case CRIME -> "Police unit with responder safety check";
            case NATURAL_DISASTER -> "Multi-agency response team";
            case OTHER -> "Dispatcher review for best available resource";
        };
    }

    private boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }

    private int clamp(int value, int min, int max) {
        return Math.max(min, Math.min(max, value));
    }

    private double clamp(double value, double min, double max) {
        return Math.max(min, Math.min(max, value));
    }

    private List<TrainingExample> trainingExamples() {
        return Arrays.asList(
                new TrainingExample(IncidentType.MEDICAL, "critical", "unconscious person not breathing chest pain cardiac arrest", true, true, 0, PriorityLevel.CRITICAL),
                new TrainingExample(IncidentType.MEDICAL, "critical", "severe bleeding after collapse patient unresponsive", true, false, 1, PriorityLevel.CRITICAL),
                new TrainingExample(IncidentType.MEDICAL, "high", "difficulty breathing stroke symptoms heavy chest pressure", true, false, 0, PriorityLevel.CRITICAL),
                new TrainingExample(IncidentType.FIRE, "critical", "explosion people trapped building on fire", true, true, 1, PriorityLevel.CRITICAL),
                new TrainingExample(IncidentType.FIRE, "high", "large fire spreading smoke inside home children trapped", true, true, 0, PriorityLevel.CRITICAL),
                new TrainingExample(IncidentType.ACCIDENT, "critical", "vehicle rollover people trapped severe bleeding", true, true, 1, PriorityLevel.CRITICAL),
                new TrainingExample(IncidentType.CRIME, "critical", "armed person with gun shots fired injured victim", true, true, 0, PriorityLevel.CRITICAL),
                new TrainingExample(IncidentType.NATURAL_DISASTER, "critical", "building collapsed many injured after landslide", true, false, 0, PriorityLevel.CRITICAL),

                new TrainingExample(IncidentType.MEDICAL, "high", "elderly person fainted weak and confused", true, false, 0, PriorityLevel.HIGH),
                new TrainingExample(IncidentType.MEDICAL, "high", "serious allergic reaction swelling and dizziness", true, true, 0, PriorityLevel.HIGH),
                new TrainingExample(IncidentType.FIRE, "high", "kitchen fire visible smoke no trapped people", true, false, 1, PriorityLevel.HIGH),
                new TrainingExample(IncidentType.ACCIDENT, "high", "motorcycle crash injured rider cannot stand", true, true, 0, PriorityLevel.HIGH),
                new TrainingExample(IncidentType.CRIME, "high", "violent fight ongoing possible knife", false, true, 0, PriorityLevel.HIGH),
                new TrainingExample(IncidentType.NATURAL_DISASTER, "high", "flood water entering houses families need evacuation", true, true, 0, PriorityLevel.HIGH),
                new TrainingExample(IncidentType.OTHER, "high", "crowd panic stampede risk people falling", true, false, 0, PriorityLevel.HIGH),

                new TrainingExample(IncidentType.MEDICAL, "medium", "fever dizziness person conscious but weak", true, false, 0, PriorityLevel.MEDIUM),
                new TrainingExample(IncidentType.MEDICAL, "medium", "minor injury needs check after fall", false, false, 0, PriorityLevel.MEDIUM),
                new TrainingExample(IncidentType.FIRE, "medium", "small controlled fire outside no injuries", true, false, 0, PriorityLevel.MEDIUM),
                new TrainingExample(IncidentType.ACCIDENT, "medium", "two cars collided road blocked no serious injuries", true, true, 0, PriorityLevel.MEDIUM),
                new TrainingExample(IncidentType.CRIME, "medium", "theft suspect left area no injuries", false, true, 0, PriorityLevel.MEDIUM),
                new TrainingExample(IncidentType.NATURAL_DISASTER, "medium", "heavy rain damaged road but no injuries", true, false, 0, PriorityLevel.MEDIUM),
                new TrainingExample(IncidentType.OTHER, "medium", "public hazard unsafe electrical wire reported", true, false, 1, PriorityLevel.MEDIUM),

                new TrainingExample(IncidentType.MEDICAL, "low", "minor headache asking for advice", false, false, 0, PriorityLevel.LOW),
                new TrainingExample(IncidentType.FIRE, "low", "burnt smell after cooking no smoke now", false, false, 0, PriorityLevel.LOW),
                new TrainingExample(IncidentType.ACCIDENT, "low", "minor scratch after small parking collision", false, false, 0, PriorityLevel.LOW),
                new TrainingExample(IncidentType.CRIME, "low", "lost item report no danger", false, false, 0, PriorityLevel.LOW),
                new TrainingExample(IncidentType.NATURAL_DISASTER, "low", "small branch fallen no road blockage", true, false, 0, PriorityLevel.LOW),
                new TrainingExample(IncidentType.OTHER, "low", "general safety concern no immediate danger", false, false, 0, PriorityLevel.LOW)
        );
    }

    private record TrainingExample(
            IncidentType type,
            String severity,
            String description,
            boolean hasGps,
            boolean hasWitness,
            int attachmentCount,
            PriorityLevel priority
    ) {}
}
