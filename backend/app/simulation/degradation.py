import random
import re
from typing import Tuple, Optional, Dict, Any

class DegradationEngine:
    """
    Simulates real-world degraded communication mechanics:
    - Variable message delay
    - Stochastic packet dropouts
    - Partial text corruption / information truncation
    - Conflicting observation generation
    - Signal reliability index
    """

    @staticmethod
    def process_message(
        original_text: str,
        reliability: float,  # 0.0 to 1.0
        current_delay: float, # seconds
        dropout_rate: float   # 0.0 to 1.0
    ) -> Tuple[str, str, float]:
        """
        Processes an outgoing message through the degradation channel.
        Returns:
            (status, delivered_text, delay_seconds)
            where status in: "DELIVERED", "DELAYED", "DROPPED", "CORRUPTED"
        """
        # 1. Check for dropout
        if dropout_rate > 0.0 and random.random() < dropout_rate:
            return ("DROPPED", "[MESSAGE TRANSMISSION FAILED - PACKET DROPPED]", 0.0)

        # 2. Check for latency
        jitter = random.uniform(-1.0, 2.5) if current_delay > 1.0 else 0.0
        effective_delay = max(0.2, current_delay + jitter)

        # 3. Check for partial corruption / truncation if reliability is below 70%
        delivered_text = original_text
        status = "DELIVERED" if effective_delay < 2.0 else "DELAYED"

        if reliability < 0.65 and random.random() < (0.8 - reliability):
            words = original_text.split()
            if len(words) > 3:
                corrupted_words = []
                for word in words:
                    # Random chance to drop word or replace with noise indicator
                    if random.random() < (0.7 - reliability):
                        corrupted_words.append("[...LOST...]")
                    else:
                        corrupted_words.append(word)
                delivered_text = " ".join(corrupted_words)
                status = "CORRUPTED"

        return (status, delivered_text, round(effective_delay, 1))

    @staticmethod
    def generate_conflicting_report(original_observation: str, sector: str) -> Dict[str, Any]:
        """
        Creates an opposing/inconsistent observation for sector deconfliction training.
        """
        has_negative = any(neg in original_observation.lower() for neg in ["no activity", "clear", "zero", "all clear", "negative"])
        
        if has_negative:
            alt_observation = f"Visual/telemetry alert in {sector}: Multiple signatures and irregular thermal spikes logged."
            alt_confidence = random.randint(58, 76)
            alt_status = "CONFLICTING"
        else:
            alt_observation = f"Ground recon sweep at {sector} reports zero contact and area quiet. Discrepancy logged."
            alt_confidence = random.randint(82, 94)
            alt_status = "CONFLICTING"

        return {
            "observation": alt_observation,
            "confidence_level": alt_confidence,
            "verification_status": alt_status,
            "title": f"Conflicting Field Assessment - {sector}"
        }

    @staticmethod
    def calculate_metrics_summary(
        total_messages: int,
        delivered_count: int,
        dropped_count: int,
        delayed_count: int,
        corrupted_count: int,
        average_latency: float
    ) -> Dict[str, Any]:
        delivery_rate = round((delivered_count / total_messages * 100) if total_messages > 0 else 100.0, 1)
        packet_loss = round((dropped_count / total_messages * 100) if total_messages > 0 else 0.0, 1)
        
        return {
            "total_transmissions": total_messages,
            "delivery_rate_percent": delivery_rate,
            "packet_loss_percent": packet_loss,
            "delayed_transmissions": delayed_count,
            "corrupted_transmissions": corrupted_count,
            "average_latency_sec": round(average_latency, 2),
            "resilience_tier": "HIGH" if delivery_rate > 80 else ("MODERATE" if delivery_rate > 50 else "CRITICAL")
        }
